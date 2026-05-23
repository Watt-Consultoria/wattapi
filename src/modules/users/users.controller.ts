import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { createUserSchema } from './dto/create-user.dto';
import { UserResponse, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: unknown): Promise<UserResponse> {
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.usersService.create(result.data);
  }

  @Get()
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':user_id')
  findOne(@Param('user_id') userId: string): Promise<UserResponse> {
    return this.usersService.findOne(userId);
  }
}
