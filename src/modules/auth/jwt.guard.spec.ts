import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { JwtGuard } from './jwt.guard';
import { AuthService } from './auth.service';
import type { UserResponse } from '../users/users.service';

function makeUser(): UserResponse {
  return {
    id: 'user-id',
    email: 'user@test.com',
    name: 'User',
    role: 'consultor',
    sector: 'projetos',
    cpf: '11111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeContext(authHeader?: string) {
  const headers: Record<string, string | undefined> = {
    authorization: authHeader,
  };
  const request: Record<string, unknown> = { headers };
  const context = {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

describe('JwtGuard', () => {
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let authService: jest.Mocked<Pick<AuthService, 'resolveUser'>>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    authService = { resolveUser: jest.fn() };
  });

  it('sets jwtStatus=no-token and returns true when no Authorization header', async () => {
    const { request, context } = makeContext(undefined);
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('no-token');
    expect(request.jwtClaims).toBeUndefined();
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=no-token and returns true when header has no Bearer prefix', async () => {
    const { request, context } = makeContext('some-token-without-prefix');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('no-token');
  });

  it('sets jwtStatus=token-expired and returns true for expired token', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new TokenExpiredError('jwt expired', new Date());
    });
    const { request, context } = makeContext('Bearer expired.token.here');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('token-expired');
    expect(request.jwtClaims).toBeUndefined();
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=token-invalid and returns true for malformed token', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const { request, context } = makeContext('Bearer bad.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('token-invalid');
    expect(request.jwtClaims).toBeUndefined();
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=user-not-found and jwtClaims when token valid but user missing', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'sub-abc',
      email: 'unknown@test.com',
    });
    authService.resolveUser.mockRejectedValue(new Error('not found'));
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('user-not-found');
    expect(request.jwtClaims).toEqual({
      sub: 'sub-abc',
      email: 'unknown@test.com',
    });
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=ok, jwtClaims, and user when token valid and user found', async () => {
    const user = makeUser();
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-id',
      email: 'user@test.com',
    });
    authService.resolveUser.mockResolvedValue(user);
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('ok');
    expect(request.jwtClaims).toEqual({
      sub: 'user-id',
      email: 'user@test.com',
    });
    expect(request.user).toBe(user);
  });
});
