/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('X-Correlation-ID', req.headers['x-correlation-id']);
    next();
  }
}
