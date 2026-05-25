import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoutePolicyGuard } from './route-policy.guard';
import type { RoutePolicyOptions } from '../decorators/route-policy.decorator';
import type { UserResponse } from '../../modules/users/users.service';
import type { DatabaseService } from '../../database/database.service';

type JwtStatus =
  | 'no-token'
  | 'token-expired'
  | 'token-invalid'
  | 'user-not-found'
  | 'ok';

function makeUser(
  role: string,
  sector = 'projetos',
  id = 'caller-id',
): UserResponse {
  return {
    id,
    email: `${role}@test.com`,
    name: role,
    role,
    sector,
    cpf: '11111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeContext(options: {
  jwtStatus?: JwtStatus;
  user?: UserResponse;
  jwtData?: { sub: string; email: string };
  params?: Record<string, string>;
  policy?: RoutePolicyOptions;
  dbRows?: { role: string }[];
}) {
  const {
    jwtStatus = 'ok',
    user,
    jwtData,
    params = {},
    policy,
    dbRows = [],
  } = options;

  const handler = {};
  const reflector = {
    get: jest.fn().mockReturnValue(policy),
  } as unknown as Reflector;

  const db = {
    query: jest.fn().mockResolvedValue({ rows: dbRows }),
  } as unknown as DatabaseService;

  const request: Record<string, unknown> = {
    jwtStatus,
    user,
    jwtData,
    params,
    policy: undefined,
  };

  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { reflector, db, request, context };
}

describe('RoutePolicyGuard', () => {
  describe('no policy (pass-through)', () => {
    it('allows when no @RoutePolicy decorator present', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor'),
        policy: undefined,
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('mode: unauthenticated', () => {
    it('allows with any jwtStatus', async () => {
      for (const status of [
        'no-token',
        'token-expired',
        'token-invalid',
        'user-not-found',
        'ok',
      ] as JwtStatus[]) {
        const { reflector, db, context } = makeContext({
          jwtStatus: status,
          policy: { access: { mode: 'unauthenticated' } },
        });
        const guard = new RoutePolicyGuard(reflector, db);
        await expect(guard.canActivate(context)).resolves.toBe(true);
      }
    });
  });

  describe('mode: unexistent', () => {
    it('allows when jwtStatus=user-not-found', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'user-not-found',
        jwtData: { sub: 'new-sub', email: 'new@test.com' },
        policy: { access: { mode: 'unexistent' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ConflictException when jwtStatus=ok (user already exists)', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'ok',
        user: makeUser('consultor'),
        policy: { access: { mode: 'unexistent' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws UnauthorizedException for no-token', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'no-token',
        policy: { access: { mode: 'unexistent' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for token-expired', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'token-expired',
        policy: { access: { mode: 'unexistent' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for token-invalid', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'token-invalid',
        policy: { access: { mode: 'unexistent' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('mode: authenticated', () => {
    it('allows authenticated user with no rba', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor'),
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws UnauthorizedException with contextual message for no-token', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'no-token',
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException with contextual message for token-expired', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'token-expired',
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      const err = await guard.canActivate(context).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect((err as UnauthorizedException).message).toMatch(/expirado/i);
    });

    it('throws UnauthorizedException for token-invalid', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'token-invalid',
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for user-not-found', async () => {
      const { reflector, db, context } = makeContext({
        jwtStatus: 'user-not-found',
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      const err = await guard.canActivate(context).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect((err as UnauthorizedException).message).toMatch(/não registrado/i);
    });
  });

  describe('rba: self', () => {
    it('allows when caller.id === params.user_id', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('gerente', 'projetos', 'caller-id'),
        params: { user_id: 'caller-id' },
        policy: { access: { mode: 'authenticated', rba: ['self'] } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when caller.id !== params.user_id', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('gerente', 'projetos', 'caller-id'),
        params: { user_id: 'other-id' },
        policy: { access: { mode: 'authenticated', rba: ['self'] } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("rba: ['minRank', n]", () => {
    it('allows caller with sufficient rank and no target', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('diretor'),
        policy: { access: { mode: 'authenticated', rba: [['minRank', 2]] } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException for caller below required rank', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('gerente'),
        policy: { access: { mode: 'authenticated', rba: [['minRank', 2]] } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows when caller outranks target', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'target-id' },
        policy: { access: { mode: 'authenticated', rba: [['minRank', 3]] } },
        dbRows: [{ role: 'gerente' }],
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when caller rank equals target rank', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'target-id' },
        policy: { access: { mode: 'authenticated', rba: [['minRank', 3]] } },
        dbRows: [{ role: 'assessor' }],
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when caller tries to act on a higher-ranked target', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'target-id' },
        policy: { access: { mode: 'authenticated', rba: [['minRank', 3]] } },
        dbRows: [{ role: 'presidente' }],
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when caller tries to act on themselves (self not in rba)', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'caller-id' },
        policy: { access: { mode: 'authenticated', rba: [['minRank', 3]] } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows access to own resource when self is also in rba', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'caller-id' },
        policy: {
          access: { mode: 'authenticated', rba: [['minRank', 3], 'self'] },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('rba: OR logic', () => {
    it('allows when first condition passes', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('assessor', 'projetos', 'caller-id'),
        params: { user_id: 'target-id' },
        policy: {
          access: { mode: 'authenticated', rba: [['minRank', 3], 'self'] },
        },
        dbRows: [{ role: 'gerente' }],
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows when second condition passes (self) but first fails (rank insufficient)', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('gerente', 'projetos', 'caller-id'),
        params: { user_id: 'caller-id' },
        policy: {
          access: { mode: 'authenticated', rba: [['minRank', 3], 'self'] },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when no condition passes', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('gerente', 'projetos', 'caller-id'),
        params: { user_id: 'other-id' },
        policy: {
          access: { mode: 'authenticated', rba: [['minRank', 3], 'self'] },
        },
        dbRows: [{ role: 'consultor' }],
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("rba: ['sector', value]", () => {
    it('allows when caller sector matches string value', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor', 'comercial'),
        policy: {
          access: { mode: 'authenticated', rba: [['sector', 'comercial']] },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when caller sector does not match string value', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor', 'projetos'),
        policy: {
          access: { mode: 'authenticated', rba: [['sector', 'comercial']] },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows when caller sector is in array value', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor', 'marketing'),
        policy: {
          access: {
            mode: 'authenticated',
            rba: [['sector', ['comercial', 'marketing']]],
          },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when caller sector not in array value', async () => {
      const { reflector, db, context } = makeContext({
        user: makeUser('consultor', 'projetos'),
        policy: {
          access: {
            mode: 'authenticated',
            rba: [['sector', ['comercial', 'marketing']]],
          },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('write policy resolution', () => {
    it('injects superuser writableFields for superuser caller (rank >= 3)', async () => {
      const { reflector, db, request, context } = makeContext({
        user: makeUser('assessor'),
        policy: {
          access: { mode: 'authenticated' },
          write: {
            superuser: ['name', 'cpf', 'role', 'sector', 'email'],
            self: ['name', 'cpf'],
          },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields: string[] }).writableFields,
      ).toEqual(['name', 'cpf', 'role', 'sector', 'email']);
    });

    it('injects self writableFields for regular user caller', async () => {
      const { reflector, db, request, context } = makeContext({
        user: makeUser('gerente'),
        policy: {
          access: { mode: 'authenticated' },
          write: {
            superuser: ['name', 'cpf', 'role', 'sector', 'email'],
            self: ['name', 'cpf'],
          },
        },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields: string[] }).writableFields,
      ).toEqual(['name', 'cpf']);
    });

    it('injects undefined writableFields when no write slice', async () => {
      const { reflector, db, request, context } = makeContext({
        user: makeUser('gerente'),
        policy: { access: { mode: 'authenticated' } },
      });
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields?: string[] }).writableFields,
      ).toBeUndefined();
    });
  });
});
