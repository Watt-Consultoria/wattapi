import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { JwtGuard } from './jwt.guard';
import { AuthService } from '../../modules/auth/auth.service';
import type { UserResponse } from '../../modules/users/users.service';

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

  it('sets jwtStatus=token-invalid when sub is not a valid UUID', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'not-a-uuid',
    });
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('token-invalid');
    expect(request.jwtData).toBeUndefined();
    expect(request.user).toBeUndefined();
    expect(authService.resolveUser).not.toHaveBeenCalled();
  });

  it('calls resolveUser with sub (id), not email', async () => {
    const user = makeUser();
    const validSub = 'a1b2c3d4-0001-0001-0001-000000000001';
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: validSub });
    authService.resolveUser.mockResolvedValue(user);
    const { context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    await guard.canActivate(context);
    expect(authService.resolveUser).toHaveBeenCalledWith(validSub);
    expect(authService.resolveUser).not.toHaveBeenCalledWith(
      expect.stringContaining('@'),
    );
  });

  it('populates jwtData with only { sub } — no email', async () => {
    const user = makeUser();
    const validSub = 'a1b2c3d4-0001-0001-0001-000000000001';
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: validSub });
    authService.resolveUser.mockResolvedValue(user);
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    await guard.canActivate(context);
    expect(request.jwtData).toEqual({ sub: validSub });
    expect(request.jwtData).not.toHaveProperty('email');
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
    expect(request.jwtData).toBeUndefined();
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
    expect(request.jwtData).toBeUndefined();
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
    expect(request.jwtData).toBeUndefined();
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=user-not-found and jwtData when token valid but user missing', async () => {
    const validSub = 'a1b2c3d4-0001-0001-0001-000000000001';
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: validSub });
    authService.resolveUser.mockRejectedValue(new Error('not found'));
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('user-not-found');
    expect(request.jwtData).toEqual({ sub: validSub });
    expect(request.user).toBeUndefined();
  });

  it('sets jwtStatus=ok, jwtData, and user when token valid and user found', async () => {
    const user = makeUser();
    const validSub = 'a1b2c3d4-0001-0001-0001-000000000001';
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: validSub });
    authService.resolveUser.mockResolvedValue(user);
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('ok');
    expect(request.jwtData).toEqual({ sub: validSub });
    expect(request.user).toBe(user);
  });
});
