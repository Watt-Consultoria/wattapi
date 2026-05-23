import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { Request } from 'express';
import { AuthService } from './auth.service';
import type { UserResponse } from '../users/users.service';

export type JwtStatus =
  | 'no-token'
  | 'token-expired'
  | 'token-invalid'
  | 'user-not-found'
  | 'ok';

export interface JwtClaims {
  sub: string;
  email: string;
}

interface JwtPayload {
  email: string;
  sub: string;
}

export type EnrichedRequest = Request & {
  jwtStatus: JwtStatus;
  jwtClaims?: JwtClaims;
  user?: UserResponse;
};

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

    request.jwtClaims = { sub: payload.sub, email: payload.email };

    try {
      request.user = await this.authService.resolveUser(payload.email);
      request.jwtStatus = 'ok';
    } catch {
      request.jwtStatus = 'user-not-found';
    }

    return true;
  }
}
