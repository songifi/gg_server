// src/modules/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter;

  constructor(private configService: ConfigService) {
    // Set up the email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    to: string,
    data: { username: string; verificationUrl: string },
  ): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Gasless Gossip');

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to,
      subject: `Verify Your Email for ${appName}`,
      html: this.getVerificationEmailTemplate(data.username, data.verificationUrl, appName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error.stack);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Gasless Gossip');
    
    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to,
      subject: `Welcome to ${appName}!`,
      html: this.getWelcomeEmailTemplate(appName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate verification email HTML template
   */
  private getVerificationEmailTemplate(
    username: string,
    verificationUrl: string,
    appName: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${appName}!</h2>
        <p>Hello ${username},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${verificationUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br/>The ${appName} Team</p>
      </div>
    `;
  }

  /**
   * Generate welcome email HTML template
   */
  private getWelcomeEmailTemplate(appName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${appName}!</h2>
        <p>Your email has been verified and your account is now active.</p>
        <p>Get started by:</p>
        <ul>
          <li>Completing your profile</li>
          <li>Connecting with other users</li>
          <li>Exploring the latest gossip</li>
        </ul>
        <p>We're excited to have you as part of our community!</p>
        <p>Best regards,<br/>The ${appName} Team</p>
      </div>
    `;
  }
}
