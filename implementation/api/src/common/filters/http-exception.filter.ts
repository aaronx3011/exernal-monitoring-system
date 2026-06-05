import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { generateRequestId } from '../utils/request-id';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || generateRequestId();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object') {
        const resp = exResponse as any;
        message = resp.message || exception.message;
        errors = resp.errors || (Array.isArray(resp.message) ? resp.message : undefined);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} ${statusCode} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
