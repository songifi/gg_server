import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BlacklistSchema } from 'src/modules/user/schemas/blacklist.schema';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { UsersModule } from 'src/users/users.module';
import { UserSchema } from 'src/modules/user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Blacklist', schema: BlacklistSchema }, {name: 'User', schema: UserSchema}]),
    UserModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  providers: [AuthenticationService, JwtService, JwtStrategy, UserService],
  controllers: [AuthenticationController],
  exports: [AuthenticationService, JwtStrategy, UserService, JwtService],
})
export class AuthenticationModule {}
