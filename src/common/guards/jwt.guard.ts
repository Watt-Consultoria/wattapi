import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import type { UserResponse } from '../../modules/users/users.service';

export type JwtStatus =
  | 'no-token'
  | 'token-expired'
  | 'token-invalid'
  | 'user-not-found'
  | 'ok';

export interface JwtData {
  sub: string;
}

interface JwtPayload {
  sub: string;
}

export type EnrichedRequest = Request & {
  jwtStatus: JwtStatus;
  jwtData?: JwtData;
  user?: UserResponse;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EnrichedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      request.jwtStatus = 'no-token';
      return true;
    }

    const token = authHeader.slice(7);

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch (err) {
      request.jwtStatus =
        err instanceof TokenExpiredError ? 'token-expired' : 'token-invalid';
      return true;
    }

    if (!UUID_REGEX.test(payload.sub)) {
      request.jwtStatus = 'token-invalid';
      return true;
    }

    request.jwtData = { sub: payload.sub };

    try {
      request.user = await this.authService.resolveUser(payload.sub);
      request.jwtStatus = 'ok';
    } catch {
      request.jwtStatus = 'user-not-found';
    }

    return true;
  }
}
