// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

import { User, UserSchema } from './schemas/user.schema';
import { UserRegistrationService } from './services/user-registration.service';
import { UserRegistrationController } from './controllers/user-registration.controller';
import { UserEventsListener } from './listeners/user-registered.listener';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EventEmitterModule.forRoot(),
    ConfigModule,
    EmailModule,
  ],
  controllers: [UserRegistrationController],
  providers: [UserRegistrationService, UserEventsListener],
  exports: [UserRegistrationService],
})
export class UserModule {}

// src/modules/email/email.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
