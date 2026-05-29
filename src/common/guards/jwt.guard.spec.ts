import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { JwtGuard } from './jwt.guard';
import { AuthService } from '../../modules/auth/auth.service';
import { EnvService } from '../../config/env.service';
import type { UserResponse } from '../../modules/users/users.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mocked-jwks'),
  jwtVerify: jest.fn(),
}));

import { jwtVerify } from 'jose';

function makeEs256Token(payload: Record<string, unknown> = {}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-sig`;
}

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
  let envService: jest.Mocked<Pick<EnvService, 'get'>>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    authService = { resolveUser: jest.fn() };
    envService = { get: jest.fn().mockReturnValue('http://127.0.0.1:54321') };
    (jwtVerify as jest.Mock).mockReset();
  });

  it('sets jwtStatus=token-invalid when sub is not a valid UUID', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'not-a-uuid',
    });
    const { request, context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
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
      envService as unknown as EnvService,
    );
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.jwtStatus).toBe('ok');
    expect(request.jwtData).toEqual({ sub: validSub });
    expect(request.user).toBe(user);
  });

  describe('ES256 (Supabase JWKS)', () => {
    beforeEach(() => {
      (jwtVerify as jest.Mock).mockReset();
    });

    it('sets jwtStatus=ok when ES256 token is valid', async () => {
      const user = makeUser();
      const validSub = 'a1b2c3d4-0001-0001-0001-000000000002';
      const token = makeEs256Token({ sub: validSub });
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: validSub },
      });
      authService.resolveUser.mockResolvedValue(user);
      const { request, context } = makeContext(`Bearer ${token}`);
      const guard = new JwtGuard(
        jwtService as unknown as JwtService,
        authService as unknown as AuthService,
        envService as unknown as EnvService,
      );
      guard.onModuleInit();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.jwtStatus).toBe('ok');
      expect(request.jwtData).toEqual({ sub: validSub });
      expect(request.user).toBe(user);
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('sets jwtStatus=token-expired when ES256 token is expired', async () => {
      const token = makeEs256Token({
        sub: 'a1b2c3d4-0001-0001-0001-000000000002',
      });
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('token expired'));
      const { request, context } = makeContext(`Bearer ${token}`);
      const guard = new JwtGuard(
        jwtService as unknown as JwtService,
        authService as unknown as AuthService,
        envService as unknown as EnvService,
      );
      guard.onModuleInit();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.jwtStatus).toBe('token-expired');
      expect(request.jwtData).toBeUndefined();
    });

    it('sets jwtStatus=token-invalid when ES256 signature is invalid', async () => {
      const token = makeEs256Token({
        sub: 'a1b2c3d4-0001-0001-0001-000000000002',
      });
      (jwtVerify as jest.Mock).mockRejectedValue(
        new Error('signature verification failed'),
      );
      const { request, context } = makeContext(`Bearer ${token}`);
      const guard = new JwtGuard(
        jwtService as unknown as JwtService,
        authService as unknown as AuthService,
        envService as unknown as EnvService,
      );
      guard.onModuleInit();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.jwtStatus).toBe('token-invalid');
      expect(request.jwtData).toBeUndefined();
    });

    it('sets jwtStatus=token-invalid when ES256 sub is not a UUID', async () => {
      const token = makeEs256Token({ sub: 'not-a-uuid' });
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'not-a-uuid' },
      });
      const { request, context } = makeContext(`Bearer ${token}`);
      const guard = new JwtGuard(
        jwtService as unknown as JwtService,
        authService as unknown as AuthService,
        envService as unknown as EnvService,
      );
      guard.onModuleInit();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.jwtStatus).toBe('token-invalid');
      expect(request.jwtData).toBeUndefined();
    });
  });

  it('does not call jwtVerify for HS256 tokens', async () => {
    const validSub = 'a1b2c3d4-0001-0001-0001-000000000001';
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: validSub });
    authService.resolveUser.mockResolvedValue(makeUser());
    const { context } = makeContext('Bearer valid.token');
    const guard = new JwtGuard(
      jwtService as unknown as JwtService,
      authService as unknown as AuthService,
      envService as unknown as EnvService,
    );
    guard.onModuleInit();
    await guard.canActivate(context);
    expect(jwtVerify).not.toHaveBeenCalled();
    expect(jwtService.verify).toHaveBeenCalled();
  });
});
