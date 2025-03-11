/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { LoggingService } from './logger.service';

@Module({
  providers: [LoggingService],
})
export class LoggerModule {}
