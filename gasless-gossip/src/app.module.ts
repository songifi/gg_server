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
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticationModule } from './authentication/authentication.module';
import { MessageModule } from './messaging/message.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    AuthenticationModule,
    UsersModule,
    AuthModule,
    ChatModule,
    LoggerModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingService],
  exports: [LoggingService],
})
export class AppModule {}
