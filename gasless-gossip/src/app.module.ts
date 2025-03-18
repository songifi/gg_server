/* eslint-disable prettier/prettier */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { AuthenticationMiddleware } from './authentication/middleware/authentication.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MessageModule } from './messaging/message.module';
// import { ConversationModule } from './conversation/conversation.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000, // duration of 60 seconds
        limit: 10, // limit to 10 requests  per user
      },
    ]),

    AuthenticationModule,
    UsersModule,
    AuthModule,
    ChatModule,
    LoggerModule,
    MessageModule,
    // ConversationModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    LoggingService,
  ],
  exports: [LoggingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthenticationMiddleware)
      .exclude('auth/(.*)') // Exclude auth endpoints like login/signup if needed
      .forRoutes('*'); // Apply to all routes
  }
}
