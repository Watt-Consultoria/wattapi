import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { UserResponse } from '../../users/users.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserResponse => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: UserResponse }>();
    return request.user;
  },
);
