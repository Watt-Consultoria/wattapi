import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { UserResponse } from '../users/users.service';
import { getRank } from './role-hierarchy';
import {
  ROUTE_POLICY_KEY,
  type OutputPolicy,
  type RoutePolicyOptions,
} from './decorators/route-policy.decorator';

type AuthRequest = Request & { user: UserResponse };

@Injectable()
export class RoleSerializerInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const policy = this.reflector.get<RoutePolicyOptions>(
      ROUTE_POLICY_KEY,
      context.getHandler(),
    );

    if (!policy?.output) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const caller = request.user;
    const callerRank = getRank(caller.role);
    const outputPolicy = policy.output;

    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          this.applyOutputPolicy(data, outputPolicy, callerRank, caller.id),
        ),
      );
  }

  private applyOutputPolicy(
    data: unknown,
    outputPolicy: OutputPolicy,
    callerRank: number,
    callerId: string,
  ): unknown {
    if (Array.isArray(data)) {
      return data.map((item: unknown) =>
        this.filterFields(
          item as Record<string, unknown>,
          outputPolicy,
          callerRank,
          null,
        ),
      );
    }
    if (data && typeof data === 'object') {
      const item = data as Record<string, unknown>;
      const selfId =
        typeof item.id === 'string' && item.id === callerId ? callerId : null;
      return this.filterFields(item, outputPolicy, callerRank, selfId);
    }
    return data;
  }

  private filterFields(
    item: Record<string, unknown>,
    outputPolicy: OutputPolicy,
    callerRank: number,
    selfId: string | null,
  ): Record<string, unknown> {
    const result = { ...item };
    for (const [field, fieldPolicy] of Object.entries(outputPolicy)) {
      if (!(field in result)) continue;
      const canSeeByRank = callerRank >= fieldPolicy.minRank;
      const canSeeBySelf = fieldPolicy.selfBypass && selfId !== null;
      if (!canSeeByRank && !canSeeBySelf) {
        delete result[field];
      }
    }
    return result;
  }
}
