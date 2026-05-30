import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { EnrichedRequest } from '../guards/jwt.guard';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<EnrichedRequest>();
    const response = http.getResponse<{ statusCode?: number }>();
    const { method, path } = request;
    const start = Date.now();

    const role = request.user?.role ?? '—';
    const sector = request.user?.sector ?? '—';
    const jwtStatus = request.jwtStatus ?? 'no-token';

    this.logger.log(
      `${method} ${path} | jwt: ${jwtStatus} | role: ${role} | sector: ${sector}`,
    );

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const status = response.statusCode ?? 200;
        this.logger.log(`${method} ${path} → ${status} | ${ms}ms`);
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - start;
        const status = err instanceof HttpException ? err.getStatus() : 500;
        this.logger.warn(`${method} ${path} → ${status} | ${ms}ms`);
        return throwError(() => err);
      }),
    );
  }
}
