/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware';
import { LoggingService } from './logger/logger.service';
import { CorrelationMiddleware } from './logger/correlation.middleware';
import { GlobalExceptionFilter } from './utils/global-exception-filter';
// import { ValidationException } from './config/exceptions/config.exceptions';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggingService);

  app.use(new RequestLoggerMiddleware(logger).use);
  app.use(new CorrelationMiddleware().use);

  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Add a default GET route for testing error handling
  // app.getHttpAdapter().get('/test-error', (req, res) => {
  //   throw new ValidationException({ id: 'ID is required' });
  // });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
