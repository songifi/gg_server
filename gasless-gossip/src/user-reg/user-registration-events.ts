// src/modules/user/events/user-registered.event.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly verificationToken: string,
  ) {}
}

// src/modules/user/events/email-verified.event.ts
export class EmailVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

// src/modules/user/listeners/user-registered.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../../email/email.service';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { EmailVerifiedEvent } from '../events/email-verified.event';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@Injectable()
export class UserEventsListener {
  private readonly logger = new Logger(UserEventsListener.name);
  
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('user.registered')
  async handleUserRegisteredEvent(event: UserRegisteredEvent) {
    this.logger.log(`User registered: ${event.email}`);
    
    // Send verification email
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationUrl = `${appUrl}/verify-email?token=${event.verificationToken}`;
    
    try {
      await this.emailService.sendVerificationEmail(event.email, {
        username: event.username,
        verificationUrl,
      });
      this.logger.log(`Verification email sent to: ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${event.email}`, error.stack);
    }
    
    // Perform additional actions after registration if needed
    // For example, create default settings, initialize user profile, etc.
  }

  @OnEvent('user.emailVerified')
  async handleEmailVerifiedEvent(event: EmailVerifiedEvent) {
    this.logger.log(`Email verified for user: ${event.email}`);
    
    try {
      // Send welcome email after verification
      await this.emailService.sendWelcomeEmail(event.email);
      this.logger.log(`Welcome email sent to: ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${event.email}`, error.stack);
    }
  }
}
