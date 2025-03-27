import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

import { RefreshToken } from '../entities/refresh-token.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Save refresh token
   */
  async saveRefreshToken(userId: string, token: string): Promise<RefreshToken> {
    try {
      const refreshToken = this.refreshTokenRepository.create({
        userId,
        token,
        expiresAt: this.getRefreshTokenExpiry(),
      });
      
      return this.refreshTokenRepository.save(refreshToken);
    } catch (error) {
      this.logger.error(`Error saving refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    try {
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: { token, isRevoked: false },
      });
      
      if (!refreshToken) {
        return null;
      }
      
      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        await this.revokeRefreshToken(token);
        return null;
      }
      
      return refreshToken.userId;
    } catch (error) {
      this.logger.error(`Error validating refresh token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(
    userId: string,
    oldToken: string,
    newToken: string,
  ): Promise<void> {
    try {
      // Revoke old token
      await this.revokeRefreshToken(oldToken);
      
      // Create new token
      await this.saveRefreshToken(userId, newToken);
    } catch (error) {
      this.logger.error(`Error updating refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { token },
        { isRevoked: true, revokedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error revoking refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error revoking all user refresh tokens: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create email verification token
   */
  async createEmailVerificationToken(userId: string): Promise<string> {
    try {
      // Revoke any existing verification tokens for this user
      await this.emailVerificationTokenRepository.update(
        { userId, isUsed: false },
        { isUsed: true, usedAt: new Date() },
      );
      
      // Generate new token
      const token = uuidv4();
      
      // Save token
      const verificationToken = this.emailVerificationTokenRepository.create({
        userId,
        token,
        expiresAt: this.getEmailVerificationTokenExpiry(),
      });
      
      await this.emailVerificationTokenRepository.save(verificationToken);
      
      return token;
    } catch (error) {
      this.logger.error(`Error creating email verification token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate email verification token
   */
  async validateEmailVerificationToken(token: string): Promise<string | null> {
    try {
      const verificationToken = await this.emailVerificationTokenRepository.findOne({
        where: { token, isUsed: false },
      });
      
      if (!verificationToken) {
        return null;
      }
      
      // Check if token is expired
      if (verificationToken.expiresAt < new Date()) {
        await this.revokeEmailVerificationToken(token);
        return null;
      }
      
      return verificationToken.userId;
    } catch (error) {
      this.logger.error(`Error validating email verification token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Revoke email verification token
   */
  async revokeEmailVerificationToken(token: string): Promise<void> {
    try {
      await this.emailVerificationTokenRepository.update(
        { token },
        { isUsed: true, usedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error revoking email verification token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    try {
      // Revoke any existing reset tokens for this user
      await this.passwordResetTokenRepository.update(
        { userId, isUsed: false },
        { isUsed: true, usedAt: new Date() },
      );
      
      // Generate new token
      const token = uuidv4();
      
      // Save token
      const resetToken = this.passwordResetTokenRepository.create({
        userId,
        token,
        expiresAt: this.getPasswordResetTokenExpiry(),
      });
      
      await this.passwordResetTokenRepository.save(resetToken);
      
      return token;
    } catch (error) {
      this.logger.error(`Error creating password reset token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<string | null> {
    try {
      const resetToken = await this.passwordResetTokenRepository.findOne({
        where: { token, isUsed: false },
      });
      
      if (!resetToken) {
        return null;
      }
      
      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        await this.revokePasswordResetToken(token);
        return null;
      }
      
      return resetToken.userId;
    } catch (error) {
      this.logger.error(`Error validating password reset token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Revoke password reset token
   */
  async revokePasswordResetToken(token: string): Promise<void> {
    try {
      await this.passwordResetTokenRepository.update(
        { token },
        { isUsed: true, usedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error revoking password reset token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get refresh token expiry date
   */
  private getRefreshTokenExpiry(): Date {
    const days = this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS', 30);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  /**
   * Get email verification token expiry date
   */
  private getEmailVerificationTokenExpiry(): Date {
    const hours = this.configService.get<number>('EMAIL_VERIFICATION_EXPIRES_HOURS', 24);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate;
  }

  /**
   * Get password reset token expiry date
   */
  private getPasswordResetTokenExpiry(): Date {
    const hours = this.configService.get<number>('PASSWORD_RESET_EXPIRES_HOURS', 1);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate;
  }
}
