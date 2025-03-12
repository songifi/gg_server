/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { LoggerModule } from './logger/logger.module';
import { LoggingService } from './logger/logger.service';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ChatModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingService],
  exports: [LoggingService],
})
export class AppModule {}
