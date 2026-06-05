import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';
import { Request } from 'express';
import { generateRequestId } from '../utils/request-id';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = generateRequestId();

    (request as any).requestId = requestId;

    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - now;
        this.logger.log(`${method} ${url} ${duration}ms [${requestId}]`);

        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
      tap({
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${duration}ms [${requestId}] - ${error.message}`,
          );
        },
      }),
    );
  }
}
