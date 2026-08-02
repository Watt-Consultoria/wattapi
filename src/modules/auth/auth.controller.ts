import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user.response.dto';
import type { UserResponse } from '../users/users.service';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(RoutePolicyGuard)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: UserResponseDto })
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
