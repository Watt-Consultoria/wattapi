import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { throwError, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import type { EnrichedRequest } from '../guards/jwt.guard';

function makeRequest(
  overrides: Partial<EnrichedRequest> = {},
): EnrichedRequest {
  return {
    method: 'GET',
    path: '/status',
    jwtStatus: 'no-token',
    user: undefined,
    ...overrides,
  } as EnrichedRequest;
}

function makeContext(
  request: EnrichedRequest,
  responseStatusCode = 200,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode: responseStatusCode }),
    }),
  } as unknown as ExecutionContext;
}

function runInterceptor(
  interceptor: LoggingInterceptor,
  context: ExecutionContext,
  handler: { handle: () => ReturnType<typeof of> },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    interceptor.intercept(context, handler as never).subscribe({
      next: resolve,
      error: reject,
    });
  });
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticated request with success', () => {
    it('emits 2 log lines with jwt status, role, sector, status code', async () => {
      const request = makeRequest({
        method: 'POST',
        path: '/users/abc',
        jwtStatus: 'ok',
        user: { id: 'u1', role: 'admin', sector: 'TI' } as never,
      });
      const context = makeContext(request, 201);
      const handler = { handle: () => of({ id: 'u1' }) };

      await runInterceptor(interceptor, context, handler);

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        'POST /users/abc | jwt: ok | role: admin | sector: TI',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^POST \/users\/abc → 201 \| \d+ms$/),
      );
    });
  });

  describe('unauthenticated request', () => {
    it('uses — as fallback for role and sector', async () => {
      const request = makeRequest({
        method: 'GET',
        path: '/status',
        jwtStatus: 'no-token',
        user: undefined,
      });
      const context = makeContext(request, 200);
      const handler = { handle: () => of(null) };

      await runInterceptor(interceptor, context, handler);

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        'GET /status | jwt: no-token | role: — | sector: —',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^GET \/status → 200 \| \d+ms$/),
      );
    });
  });

  describe('request resulting in HTTP error', () => {
    it('captures status code from HttpException and rethrows', async () => {
      const request = makeRequest({
        method: 'DELETE',
        path: '/users/xyz',
        jwtStatus: 'ok',
        user: { id: 'u2', role: 'consultor', sector: 'OP' } as never,
      });
      const context = makeContext(request);
      const error = new HttpException('Forbidden', 403);
      const handler = { handle: () => throwError(() => error) };

      await expect(runInterceptor(interceptor, context, handler)).rejects.toBe(
        error,
      );

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        'DELETE /users/xyz | jwt: ok | role: consultor | sector: OP',
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^DELETE \/users\/xyz → 403 \| \d+ms$/),
      );
    });

    it('uses 500 for non-HttpException errors', async () => {
      const request = makeRequest({
        method: 'GET',
        path: '/boom',
        jwtStatus: 'ok',
        user: { id: 'u3', role: 'admin', sector: 'TI' } as never,
      });
      const context = makeContext(request);
      const error = new Error('unexpected');
      const handler = { handle: () => throwError(() => error) };

      await expect(runInterceptor(interceptor, context, handler)).rejects.toBe(
        error,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^GET \/boom → 500 \| \d+ms$/),
      );
    });
  });
});
