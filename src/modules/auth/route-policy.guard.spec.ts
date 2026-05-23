import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoutePolicyGuard } from './route-policy.guard';
import type { RoutePolicyOptions } from './decorators/route-policy.decorator';
import type { UserResponse } from '../users/users.service';
import type { DatabaseService } from '../../database/database.service';

function makeUser(role: string, id = 'caller-id'): UserResponse {
  return {
    id,
    email: `${role}@test.com`,
    name: role,
    role,
    sector: 'projetos',
    cpf: '11111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeContext(
  user: UserResponse,
  params: Record<string, string>,
  policy: RoutePolicyOptions | undefined,
  dbRows: { role: string }[] = [],
) {
  const handler = {};
  const reflector = {
    get: jest.fn().mockReturnValue(policy),
  } as unknown as Reflector;

  const db = {
    query: jest.fn().mockResolvedValue({ rows: dbRows }),
  } as unknown as DatabaseService;

  const request: Record<string, unknown> = { user, params, policy: undefined };

  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { reflector, db, request, context };
}

describe('RoutePolicyGuard', () => {
  describe('no policy (pass-through)', () => {
    it('allows when no @RoutePolicy decorator present', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('consultor'),
        {},
        undefined,
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('mode: authenticated', () => {
    it('allows any authenticated user', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('consultor'),
        {},
        { access: { mode: 'authenticated' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('mode: min-rank', () => {
    it('allows caller with sufficient rank', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('diretor'),
        {},
        { access: { mode: 'min-rank', minRank: 2 } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows caller with exact required rank', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('gerente'),
        {},
        { access: { mode: 'min-rank', minRank: 1 } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException for caller below required rank', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('consultor'),
        {},
        { access: { mode: 'min-rank', minRank: 2 } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mode: superuser-or-self', () => {
    it('allows superuser editing a target of lower rank', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-or-self' } },
        [{ role: 'gerente' }],
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when superuser tries to edit target of equal rank', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-or-self' } },
        [{ role: 'assessor' }],
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when assessor tries to edit presidente', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-or-self' } },
        [{ role: 'presidente' }],
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows superuser editing themselves', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'caller-id' },
        { access: { mode: 'superuser-or-self' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows regular user editing themselves', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('gerente', 'caller-id'),
        { user_id: 'caller-id' },
        { access: { mode: 'superuser-or-self' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when regular user tries to edit another user', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('gerente', 'caller-id'),
        { user_id: 'other-id' },
        { access: { mode: 'superuser-or-self' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mode: superuser-only', () => {
    it('allows superuser action on lower rank target', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('presidente', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-only' } },
        [{ role: 'assessor' }],
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException for regular user', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('diretor', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-only' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException for self-action when noSelfAccess is true', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'caller-id' },
        { access: { mode: 'superuser-only', noSelfAccess: true } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when assessor tries to act on presidente', async () => {
      const { reflector, db, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        { user_id: 'target-id' },
        { access: { mode: 'superuser-only', noSelfAccess: true } },
        [{ role: 'presidente' }],
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('write policy resolution', () => {
    it('injects superuser writableFields for superuser caller', async () => {
      const { reflector, db, request, context } = makeContext(
        makeUser('assessor', 'caller-id'),
        {},
        {
          access: { mode: 'authenticated' },
          write: {
            superuser: ['name', 'cpf', 'role', 'sector', 'email'],
            self: ['name', 'cpf'],
          },
        },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields: string[] }).writableFields,
      ).toEqual(['name', 'cpf', 'role', 'sector', 'email']);
    });

    it('injects self writableFields for regular user caller', async () => {
      const { reflector, db, request, context } = makeContext(
        makeUser('gerente', 'caller-id'),
        {},
        {
          access: { mode: 'authenticated' },
          write: {
            superuser: ['name', 'cpf', 'role', 'sector', 'email'],
            self: ['name', 'cpf'],
          },
        },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields: string[] }).writableFields,
      ).toEqual(['name', 'cpf']);
    });

    it('injects undefined writableFields when no write slice', async () => {
      const { reflector, db, request, context } = makeContext(
        makeUser('gerente', 'caller-id'),
        {},
        { access: { mode: 'authenticated' } },
      );
      const guard = new RoutePolicyGuard(reflector, db);
      await guard.canActivate(context);
      expect(
        (request.policy as { writableFields?: string[] }).writableFields,
      ).toBeUndefined();
    });
  });
});
