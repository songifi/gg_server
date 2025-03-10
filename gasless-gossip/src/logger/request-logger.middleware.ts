/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from './logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    this.logger.log(`${method} ${originalUrl} - IP: ${ip}`, 'Request');

    res.on('finish', () => {
      this.logger.log(`${method} ${originalUrl} - Status: ${res.statusCode}`, 'Response');
    });

    next();
  }
}
