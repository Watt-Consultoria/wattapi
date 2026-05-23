import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { createUserSchema, updateUserSchema } from './dto/create-user.dto';
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

  @Patch(':user_id')
  update(
    @Param('user_id') userId: string,
    @Body() body: unknown,
  ): Promise<UserResponse> {
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
  deactivate(@Param('user_id') userId: string): Promise<void> {
    return this.usersService.deactivate(userId);
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
