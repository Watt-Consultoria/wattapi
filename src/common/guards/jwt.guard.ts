import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { EnvService } from '../../config/env.service';
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

function getAlgorithm(token: string): string | null {
  try {
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString(),
    ) as { alg?: string };
    return header.alg ?? null;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtGuard.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly envService: EnvService,
  ) {}

  onModuleInit() {
    const supabaseUrl = this.envService.get('SUPABASE_URL');
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    this.jwks = createRemoteJWKSet(jwksUrl);
    this.logger.log(
      `JWKS client initialized — endpoint: ${jwksUrl.toString()}`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EnrichedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.log('Request missing Bearer token');
      request.jwtStatus = 'no-token';
      return true;
    }

    const token = authHeader.slice(7);
    const alg = getAlgorithm(token);
    this.logger.log(`Token received — alg: ${alg ?? 'unreadable'}`);

    let payload: JwtPayload;
    try {
      if (alg === 'ES256' && this.jwks) {
        this.logger.log('Verifying ES256 token via JWKS');
        const { payload: p } = await jwtVerify(token, this.jwks);
        if (typeof p.sub !== 'string') throw new Error('missing sub');
        payload = { sub: p.sub };
        this.logger.log(`ES256 token valid — sub: ${payload.sub}`);
      } else {
        this.logger.log(`Verifying ${alg ?? 'unknown'} token via JWT_SECRET`);
        payload = this.jwtService.verify<JwtPayload>(token);
        this.logger.log(`HS256 token valid — sub: ${payload.sub}`);
      }
    } catch (err) {
      const isExpired =
        err instanceof TokenExpiredError ||
        (err instanceof Error && err.message.includes('expired'));
      request.jwtStatus = isExpired ? 'token-expired' : 'token-invalid';
      this.logger.warn(
        `Token verification failed — status: ${request.jwtStatus}, alg: ${alg ?? 'unreadable'}, reason: ${err instanceof Error ? err.message : String(err)}`,
      );
      return true;
    }

    if (!UUID_REGEX.test(payload.sub)) {
      request.jwtStatus = 'token-invalid';
      this.logger.warn(
        `Token rejected — sub is not a valid UUID: "${payload.sub}"`,
      );
      return true;
    }

    request.jwtData = { sub: payload.sub };

    try {
      request.user = await this.authService.resolveUser(payload.sub);
      request.jwtStatus = 'ok';
      this.logger.log(
        `User resolved — sub: ${payload.sub}, role: ${request.user.role}`,
      );
    } catch {
      request.jwtStatus = 'user-not-found';
      this.logger.warn(`User not found in public.users — sub: ${payload.sub}`);
    }

    return true;
  }
}
