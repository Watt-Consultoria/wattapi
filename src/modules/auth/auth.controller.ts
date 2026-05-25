import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
