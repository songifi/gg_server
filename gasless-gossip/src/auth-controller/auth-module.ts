import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RegisterController } from './controllers/register.controller';
import { LoginController } from './controllers/login.controller';
import { PasswordController } from './controllers/password.controller';
import { VerificationController } from './controllers/verification.controller';

import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { TokenService } from './services/token.service';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    ConfigModule,
  ],
  controllers: [
    RegisterController,
    LoginController,
    PasswordController,
    VerificationController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    EmailService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
  ],
})
export class AuthModule {}
