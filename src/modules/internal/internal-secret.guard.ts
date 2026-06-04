import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { EnvService } from '../../config/env.service';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly envService: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-secret'];

    if (typeof provided !== 'string' || provided.length === 0) {
      throw new UnauthorizedException();
    }

    const expected = this.envService.get('INTERNAL_JOB_SECRET');

    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);

    if (providedBuf.length !== expectedBuf.length) {
      throw new UnauthorizedException();
    }

    if (!timingSafeEqual(providedBuf, expectedBuf)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
