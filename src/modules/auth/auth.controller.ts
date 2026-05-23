import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoutePolicyGuard } from './route-policy.guard';
import { RoutePolicy } from './decorators/route-policy.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserResponse } from '../users/users.service';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(RoutePolicyGuard)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
