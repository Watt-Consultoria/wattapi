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
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoleSerializerInterceptor } from '../../common/interceptors/role-serializer.interceptor';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { AuthService } from '../auth/auth.service';
import type { JwtData } from '../../common/guards/jwt.guard';
import { getRank, isSuperuser } from '../../common/guards/role-hierarchy';
import {
  updateUserSchema,
  CreateUserDto,
  UpdateUserDto,
} from './dto/create-user.dto';
import { UserResponseDto } from './dto/user.response.dto';
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
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(
    @Body() body: CreateUserDto,
    @Req() req: AuthRequest,
  ): Promise<UserResponse> {
    const { sub } = req.jwtData;
    const email = await this.authService.getAuthEmail(sub);
    return this.usersService.create(sub, email, body);
  }

  @Patch(':user_id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('user_id') userId: string,
    @Body() body: UpdateUserDto,
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

    const allFields = Object.keys(updateUserSchema.shape);
    const restricted = allFields.filter((f) => !writableFields.includes(f));
    for (const field of restricted) {
      if (field in body) {
        throw new ForbiddenException(`Field '${field}' cannot be modified`);
      }
    }

    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.usersService.update(userId, body);
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
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@Param('user_id') userId: string): Promise<UserResponse> {
    return this.usersService.findOne(userId);
  }
}
