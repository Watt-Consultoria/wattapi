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
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoleSerializerInterceptor } from '../../common/interceptors/role-serializer.interceptor';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { AuthService } from '../auth/auth.service';
import type { JwtData } from '../../common/guards/jwt.guard';
import { getRank, isSuperuser } from '../../common/guards/role-hierarchy';
import { updateUserSchema, createUserSchema } from './dto/create-user.dto';
import { UsersService, type UserResponse } from './users.service';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

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
  async create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
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
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  async update(
    @Param('user_id') userId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<UserResponse> {
    const caller = req.user;
    const isSelf = caller.id === userId;

    if (!isSelf) {
      if (!isSuperuser(caller.role)) throw new ForbiddenException();
      const target = await this.usersService.findOne(userId);
      if (getRank(caller.role) <= getRank(target.role))
        throw new ForbiddenException();
    }

    const writableFields = isSuperuser(caller.role)
      ? ['email', 'name', 'role', 'sector', 'cpf']
      : ['name', 'cpf'];

    if (typeof body === 'object' && body !== null) {
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
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  async deactivate(
    @Param('user_id') userId: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const caller = req.user;
    const target = await this.usersService.findOne(userId);
    if (getRank(caller.role) <= getRank(target.role))
      throw new ForbiddenException();
    return this.usersService.deactivate(userId);
  }

  @Get()
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: false } },
  })
  findAll(): Promise<import('./users.service').UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  findOne(
    @Param('user_id') userId: string,
  ): Promise<import('./users.service').UserResponse> {
    return this.usersService.findOne(userId);
  }
}
