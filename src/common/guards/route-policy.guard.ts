import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import type { UserResponse } from '../../modules/users/users.service';
import { getRank, isSuperuser } from './role-hierarchy';
import type { JwtData, JwtStatus } from './jwt.guard';
import {
  ROUTE_POLICY_KEY,
  type RbaCondition,
  type RoutePolicyOptions,
} from '../decorators/route-policy.decorator';

export interface ResolvedPolicy {
  canAccess: true;
  writableFields?: string[];
}

type PolicyRequest = Request & {
  jwtStatus: JwtStatus;
  jwtData?: JwtData;
  user?: UserResponse;
  policy: ResolvedPolicy;
  params: Record<string, string>;
};

const MESSAGES = {
  noToken: 'Nenhum token de autenticação fornecido',
  tokenExpired: 'Token expirado, faça login novamente',
  tokenInvalid: 'Token de autenticação inválido',
  userNotFound: 'Usuário não registrado no sistema',
  alreadyRegistered: 'Usuário já registrado',
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
    const { access, write } = policy;
    const { mode } = access;
    const jwtStatus = request.jwtStatus;

    if (mode === 'unauthenticated') {
      // no requirements
    } else if (mode === 'unexistent') {
      this.requireClaims(jwtStatus);
      if (jwtStatus === 'ok') {
        throw new ConflictException(MESSAGES.alreadyRegistered);
      }
    } else {
      // authenticated
      this.requireClaims(jwtStatus);
      if (jwtStatus === 'user-not-found') {
        throw new UnauthorizedException(MESSAGES.userNotFound);
      }

      const rba = access.rba;
      if (rba && rba.length > 0) {
        const caller = request.user!;
        const targetId = request.params?.user_id;
        const passed = await this.evaluateRba(rba, caller, targetId);
        if (!passed) throw new ForbiddenException();
      }
    }

    const caller = request.user;
    request.policy = {
      canAccess: true,
      writableFields: write
        ? caller && isSuperuser(caller.role)
          ? write.superuser
          : write.self
        : undefined,
    };

    return true;
  }

  private requireClaims(jwtStatus: JwtStatus): void {
    if (jwtStatus === 'no-token') {
      throw new UnauthorizedException(MESSAGES.noToken);
    }
    if (jwtStatus === 'token-expired') {
      throw new UnauthorizedException(MESSAGES.tokenExpired);
    }
    if (jwtStatus === 'token-invalid') {
      throw new UnauthorizedException(MESSAGES.tokenInvalid);
    }
  }

  private async evaluateRba(
    rba: RbaCondition[],
    caller: UserResponse,
    targetId: string | undefined,
  ): Promise<boolean> {
    for (const condition of rba) {
      if (condition === 'self') {
        if (targetId && caller.id === targetId) return true;
      } else if (Array.isArray(condition)) {
        const [type, value] = condition;

        if (type === 'minRank') {
          const n = value;
          if (getRank(caller.role) >= n) {
            if (targetId) {
              if (caller.id === targetId) continue; // self not allowed via minRank alone
              const targetRole = await this.loadTargetRole(targetId);
              if (targetRole === null) return true; // target not found, let service handle 404
              if (getRank(caller.role) > getRank(targetRole)) return true;
            } else {
              return true;
            }
          }
        } else if (type === 'sector') {
          const sectorValue = value;
          if (Array.isArray(sectorValue)) {
            if (sectorValue.includes(caller.sector)) return true;
          } else {
            if (caller.sector === sectorValue) return true;
          }
        } else if (type === 'roleAndSector') {
          const { roles, sectors } = value as {
            roles: string[];
            sectors: string[];
          };
          if (roles.includes(caller.role) && sectors.includes(caller.sector))
            return true;
        }
      }
    }
    return false;
  }

  private async loadTargetRole(id: string): Promise<string | null> {
    const result = await this.db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1 AND inactive = false',
      [id],
    );
    return result.rows[0]?.role ?? null;
  }
}
