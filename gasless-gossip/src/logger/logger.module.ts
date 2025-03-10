/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { LoggingService } from './logger.service';
import { LoggerController } from './logger.controller';

@Module({
  controllers: [LoggerController],
  providers: [LoggingService],
})
export class LoggerModule {}
