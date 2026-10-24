import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { CallNotFoundError, DomainError } from '../domain/errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const status = error instanceof CallNotFoundError ? 404 : 400;
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
