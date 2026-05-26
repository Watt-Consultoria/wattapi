import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  RoutePolicyGuard,
  type ResolvedPolicy,
} from '../../common/guards/route-policy.guard';
import { RoleSerializerInterceptor } from '../../common/interceptors/role-serializer.interceptor';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { AuthService } from '../auth/auth.service';
import type { JwtData } from '../../common/guards/jwt.guard';
import {
  updateUserSchema,
  createUserSchema,
  CreateUserBody,
  UpdateUserBody,
  UserResponseSchema,
} from './dto/create-user.dto';
import { UsersService } from './users.service';

type PolicyRequest = Request & {
  policy?: ResolvedPolicy;
  jwtData: JwtData;
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RoutePolicyGuard)
@UseInterceptors(RoleSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'unexistent' } })
  @ApiOperation({
    summary: 'Criar perfil de usuário',
    description:
      'Cria o perfil de um usuário que já existe no Supabase Auth mas ainda não possui cadastro no sistema. ' +
      'O papel (role) é automaticamente definido como `consultor`. ' +
      'Requer token JWT válido de um usuário **sem** perfil cadastrado.',
  })
  @ApiBody({ type: CreateUserBody })
  @ApiResponse({
    status: 201,
    description: 'Perfil criado com sucesso',
    type: UserResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiConflictResponse({
    description: 'Usuário já cadastrado ou CPF/e-mail duplicado',
  })
  async create(
    @Body() body: unknown,
    @Req() req: PolicyRequest,
  ): Promise<import('./users.service').UserResponse> {
    const { sub } = req.jwtData;
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    const email = await this.authService.getAuthEmail(sub);
    return this.usersService.create(sub, email, result.data);
  }

  @Patch(':user_id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['minRank', 3], 'self'],
    },
    write: {
      superuser: ['email', 'name', 'role', 'sector', 'cpf'],
      self: ['name', 'cpf'],
    },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  @ApiOperation({
    summary: 'Atualizar dados de um usuário',
    description:
      'Usuários comuns podem editar apenas `name` e `cpf` do próprio perfil. ' +
      'Superusuários (assessor/presidente) podem editar qualquer campo de qualquer usuário.',
  })
  @ApiParam({ name: 'user_id', description: 'UUID do usuário', format: 'uuid' })
  @ApiBody({ type: UpdateUserBody })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado',
    type: UserResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Sem permissão para editar este usuário ou este campo',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'E-mail ou CPF já em uso' })
  update(
    @Param('user_id') userId: string,
    @Body() body: unknown,
    @Req() req: PolicyRequest,
  ): Promise<import('./users.service').UserResponse> {
    const writableFields = req.policy?.writableFields;

    if (
      writableFields !== undefined &&
      typeof body === 'object' &&
      body !== null
    ) {
      const allFields = Object.keys(updateUserSchema.shape);
      const restricted = allFields.filter((f) => !writableFields.includes(f));
      for (const field of restricted) {
        if (field in (body as Record<string, unknown>)) {
          throw new ForbiddenException(`Field '${field}' cannot be modified`);
        }
      }
    }

    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.usersService.update(userId, result.data);
  }

  @Delete(':user_id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  @ApiOperation({
    summary: 'Desativar usuário',
    description:
      'Realiza a desativação (soft delete) de um usuário. ' +
      'Requer permissão de superusuário (assessor ou presidente).',
  })
  @ApiParam({ name: 'user_id', description: 'UUID do usuário', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Usuário desativado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Requer rank >= 3 (assessor/presidente)',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  deactivate(@Param('user_id') userId: string): Promise<void> {
    return this.usersService.deactivate(userId);
  }

  @Get()
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: false } },
  })
  @ApiOperation({
    summary: 'Listar todos os usuários ativos',
    description:
      'Retorna todos os usuários ativos ordenados por data de criação. ' +
      'O campo `cpf` é omitido para usuários com rank < 2 (consultor/gerente).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários',
    type: [UserResponseSchema],
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  findAll(): Promise<import('./users.service').UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description:
      'Retorna um usuário específico. ' +
      'O campo `cpf` é omitido para usuários com rank < 2, exceto quando consultando o próprio perfil.',
  })
  @ApiParam({ name: 'user_id', description: 'UUID do usuário', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário',
    type: UserResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  findOne(
    @Param('user_id') userId: string,
  ): Promise<import('./users.service').UserResponse> {
    return this.usersService.findOne(userId);
  }
}
