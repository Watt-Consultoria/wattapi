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
import { JwtGuard } from '../auth/jwt.guard';
import {
  RoutePolicyGuard,
  type ResolvedPolicy,
} from '../auth/route-policy.guard';
import { RoleSerializerInterceptor } from '../auth/role-serializer.interceptor';
import { RoutePolicy } from '../auth/decorators/route-policy.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { createUserSchema, updateUserSchema } from './dto/create-user.dto';
import { UsersService } from './users.service';
import type { UserResponse } from './users.service';

type PolicyRequest = Request & { policy?: ResolvedPolicy };

@Controller('users')
@UseGuards(JwtGuard, RoutePolicyGuard)
@UseInterceptors(RoleSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  create(
    @Body() body: unknown,
    @CurrentUser() caller: UserResponse,
  ): Promise<UserResponse> {
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    if (result.data.email !== caller.email) {
      throw new ForbiddenException('You can only create your own user account');
    }
    return this.usersService.create(result.data);
  }

  @Patch(':user_id')
  @RoutePolicy({
    access: { mode: 'superuser-or-self' },
    write: {
      superuser: ['email', 'name', 'role', 'sector', 'cpf'],
      self: ['name', 'cpf'],
    },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  update(
    @Param('user_id') userId: string,
    @Body() body: unknown,
    @Req() req: PolicyRequest,
  ): Promise<UserResponse> {
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
  @RoutePolicy({ access: { mode: 'superuser-only', noSelfAccess: true } })
  deactivate(@Param('user_id') userId: string): Promise<void> {
    return this.usersService.deactivate(userId);
  }

  @Get()
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: false } },
  })
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
    output: { cpf: { minRank: 2, selfBypass: true } },
  })
  findOne(@Param('user_id') userId: string): Promise<UserResponse> {
    return this.usersService.findOne(userId);
  }
}
