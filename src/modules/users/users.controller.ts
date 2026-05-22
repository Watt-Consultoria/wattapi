import { Controller, Get, Param } from '@nestjs/common';
import { UserResponse, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  findOne(@Param('user_id') userId: string): Promise<UserResponse> {
    return this.usersService.findOne(userId);
  }
}
