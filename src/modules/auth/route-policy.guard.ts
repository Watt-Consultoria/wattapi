import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import type { UserResponse } from '../users/users.service';
import { getRank, isSuperuser } from './role-hierarchy';
import {
  ROUTE_POLICY_KEY,
  type RoutePolicyOptions,
} from './decorators/route-policy.decorator';

export interface ResolvedPolicy {
  canAccess: true;
  writableFields?: string[];
}

type PolicyRequest = Request & {
  user: UserResponse;
  policy: ResolvedPolicy;
  params: Record<string, string>;
};

@Injectable()
export class RoutePolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<RoutePolicyOptions>(
      ROUTE_POLICY_KEY,
      context.getHandler(),
    );

    if (!policy?.access) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PolicyRequest>();
    const caller = request.user;
    const { mode, minRank, noSelfAccess } = policy.access;
    const targetId = request.params.user_id;

    switch (mode) {
      case 'authenticated':
        break;

      case 'min-rank': {
        if (getRank(caller.role) < (minRank ?? 0)) {
          throw new ForbiddenException();
        }
        break;
      }

      case 'superuser-or-self': {
        if (isSuperuser(caller.role)) {
          if (targetId && caller.id !== targetId) {
            const targetRole = await this.loadTargetRole(targetId);
            if (
              targetRole !== null &&
              getRank(caller.role) <= getRank(targetRole)
            ) {
              throw new ForbiddenException();
            }
          }
        } else {
          if (!targetId || caller.id !== targetId) {
            throw new ForbiddenException();
          }
        }
        break;
      }

      case 'superuser-only': {
        if (!isSuperuser(caller.role)) {
          throw new ForbiddenException();
        }
        if (noSelfAccess && targetId && caller.id === targetId) {
          throw new ForbiddenException();
        }
        if (targetId && caller.id !== targetId) {
          const targetRole = await this.loadTargetRole(targetId);
          if (
            targetRole !== null &&
            getRank(caller.role) <= getRank(targetRole)
          ) {
            throw new ForbiddenException();
          }
        }
        break;
      }
    }

    request.policy = {
      canAccess: true,
      writableFields: policy.write
        ? isSuperuser(caller.role)
          ? policy.write.superuser
          : policy.write.self
        : undefined,
    };

    return true;
  }

  private async loadTargetRole(id: string): Promise<string | null> {
    const result = await this.db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1 AND inactive = false',
      [id],
    );
    return result.rows[0]?.role ?? null;
  }
}
