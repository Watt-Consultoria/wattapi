import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserResponse } from '../users/users.service';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
