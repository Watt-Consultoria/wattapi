import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { RoleSerializerInterceptor } from './role-serializer.interceptor';
import type { RoutePolicyOptions } from '../decorators/route-policy.decorator';
import type { UserResponse } from '../../modules/users/users.service';

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
  policy: RoutePolicyOptions | undefined,
) {
  const handler = {};
  const reflector = {
    get: jest.fn().mockReturnValue(policy),
  } as unknown as Reflector;

  const request = { user };
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { reflector, context };
}

function runInterceptor(
  interceptor: RoleSerializerInterceptor,
  context: ExecutionContext,
  response: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callHandler = { handle: () => of(response) };
    interceptor.intercept(context, callHandler).subscribe({
      next: resolve,
      error: reject,
    });
  });
}

describe('RoleSerializerInterceptor', () => {
  describe('no output policy', () => {
    it('passes response through unchanged', async () => {
      const { reflector, context } = makeContext(
        makeUser('consultor'),
        undefined,
      );
      const interceptor = new RoleSerializerInterceptor(reflector);
      const response = { id: '1', name: 'Ana', cpf: '123' };
      const result = await runInterceptor(interceptor, context, response);
      expect(result).toEqual(response);
    });
  });

  describe('list response — selfBypass never applies', () => {
    const policy: RoutePolicyOptions = {
      output: { cpf: { minRank: 2, selfBypass: true } },
    };

    it('removes cpf from all items when caller rank < minRank', async () => {
      const caller = makeUser('gerente', 'id-1');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const list = [
        { id: 'id-1', name: 'A', cpf: '111' },
        { id: 'id-2', name: 'B', cpf: '222' },
      ];

      const result = await runInterceptor(interceptor, context, list);
      expect(result).toEqual([
        { id: 'id-1', name: 'A' },
        { id: 'id-2', name: 'B' },
      ]);
    });

    it('removes cpf from own item too when caller rank < minRank', async () => {
      const caller = makeUser('consultor', 'id-1');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const list = [{ id: 'id-1', name: 'A', cpf: '111' }];
      const result = await runInterceptor(interceptor, context, list);
      expect(result).toEqual([{ id: 'id-1', name: 'A' }]);
    });

    it('preserves cpf for all items when caller rank >= minRank', async () => {
      const caller = makeUser('diretor', 'id-1');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const list = [
        { id: 'id-1', name: 'A', cpf: '111' },
        { id: 'id-2', name: 'B', cpf: '222' },
      ];

      const result = await runInterceptor(interceptor, context, list);
      expect(result).toEqual(list);
    });
  });

  describe('singular response — selfBypass applies', () => {
    const policy: RoutePolicyOptions = {
      output: { cpf: { minRank: 2, selfBypass: true } },
    };

    it('allows low-rank caller to see own cpf (selfBypass)', async () => {
      const caller = makeUser('gerente', 'caller-id');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const response = { id: 'caller-id', name: 'Carlos', cpf: '999' };
      const result = await runInterceptor(interceptor, context, response);
      expect(result).toEqual(response);
    });

    it('removes cpf from low-rank caller viewing another user', async () => {
      const caller = makeUser('gerente', 'caller-id');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const response = { id: 'other-id', name: 'Maria', cpf: '999' };
      const result = await runInterceptor(interceptor, context, response);
      expect(result).toEqual({ id: 'other-id', name: 'Maria' });
    });

    it('allows high-rank caller to see any user cpf', async () => {
      const caller = makeUser('diretor', 'caller-id');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const response = { id: 'other-id', name: 'Maria', cpf: '999' };
      const result = await runInterceptor(interceptor, context, response);
      expect(result).toEqual(response);
    });
  });

  describe('selfBypass: false — self cannot bypass rank restriction', () => {
    const policy: RoutePolicyOptions = {
      output: { cpf: { minRank: 2, selfBypass: false } },
    };

    it('removes cpf even from own object when selfBypass is false', async () => {
      const caller = makeUser('gerente', 'caller-id');
      const { reflector, context } = makeContext(caller, policy);
      const interceptor = new RoleSerializerInterceptor(reflector);

      const response = { id: 'caller-id', name: 'Carlos', cpf: '999' };
      const result = await runInterceptor(interceptor, context, response);
      expect(result).toEqual({ id: 'caller-id', name: 'Carlos' });
    });
  });
});
