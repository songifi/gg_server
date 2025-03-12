import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logger.service';

@Global() // Makes the module global so it's available everywhere
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggerModule {}
