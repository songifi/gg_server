import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logger/logger.service';

@Catch(HttpException)
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error response
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    let errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: 500,
            message: 'Internal server error',
          };

    // Normalize errorResponse if it’s a string
    if (typeof errorResponse === 'string') {
      errorResponse = { message: errorResponse };
    }

    // Log the error with context
    const logMessage = `Error ${status}: ${exception instanceof Error ? exception.message : 'Unknown error'}`;
    const logContext = {
      path: request.url,
      method: request.method,
      body: request?.body as unknown,
      query: request.query,
    };

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter',
      );
    } else {
      this.logger.warn(logMessage, 'GlobalExceptionFilter');
    }
    console.log(logContext);

    // Send the response
    response.status(status).json({
      ...errorResponse,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
