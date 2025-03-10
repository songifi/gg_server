/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware';
import { LoggingService } from './logger/logger.service';
import { CorrelationMiddleware } from './logger/correlation.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggingService);

  app.use(new RequestLoggerMiddleware(logger).use);
  app.use(new CorrelationMiddleware().use);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
