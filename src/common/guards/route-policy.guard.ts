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
import type { UserResponse } from '../../modules/users/users.service';
import type { JwtData, JwtStatus } from './jwt.guard';
import {
  ROUTE_POLICY_KEY,
  type RbaAccessCondition,
  type RoutePolicyOptions,
} from '../decorators/route-policy.decorator';

type PolicyRequest = Request & {
  jwtStatus: JwtStatus;
  jwtData?: JwtData;
  user?: UserResponse;
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
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Extrai o contexto da rota: Metadados definidos através do decorador @RoutePolicy e informações da requisição HTTP
    const policy = this.reflector.get<RoutePolicyOptions>(
      ROUTE_POLICY_KEY,
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest<PolicyRequest>();

    // Exige que a política de acesso seja definida para cada rota protegida por este guard
    if (!policy?.access) {
      throw new Error('Route policy acess options not defined');
    }

    const { access } = policy;
    const { mode } = access;
    const jwtStatus = request.jwtStatus;

    if (mode === 'unauthenticated') {
      // no requirements
      return true;
    }

    this.requireClaims(jwtStatus);

    // Usuário que existe na tabela de autenticação, mas não na tabela de usuários (ex: cadastro incompleto)
    if (mode === 'unexistent') {
      // Exige que o usuário não exista na tabela de usuários
      if (jwtStatus === 'ok') {
        throw new ConflictException(MESSAGES.alreadyRegistered);
      }
    }

    if (mode === 'authenticated') {
      if (jwtStatus === 'user-not-found') {
        throw new UnauthorizedException(MESSAGES.userNotFound);
      }

      const acessRba = access.rba;

      if (acessRba && acessRba.length > 0) {
        const caller = request.user!;
        const passed = this.evaluateRba(acessRba, caller);
        if (!passed) throw new ForbiddenException();
      }
    }

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

  private evaluateRba(rba: RbaAccessCondition[], caller: UserResponse) {
    for (const condition of rba) {
      if (Array.isArray(condition)) {
        const [type, value] = condition;

        if (type === 'role') {
          if (value.includes(caller.role)) {
            return true;
          }
        }

        if (type === 'sector') {
          const sectorValue = value;
          if (sectorValue.includes(caller.sector)) return true;
        }

        if (type === 'role AND sector') {
          const { roles, sectors } = value;

          if (roles.includes(caller.role) && sectors.includes(caller.sector)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
