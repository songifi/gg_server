import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { UserService } from '../../user/services/user.service';
import { TokenService } from './token.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';

import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { AuthResponse, TokenResponse } from '../interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Hash password
      const hashedPassword = await this.hashPassword(registerDto.password);
      
      // Create user
      const user = await this.userService.create({
        ...registerDto,
        password: hashedPassword,
        isEmailVerified: false,
        roles: ['user'], // Default role
      });
      
      // Generate tokens
      const tokens = await this.generateTokens(user.id);
      
      // Store refresh token
      await this.tokenService.saveRefreshToken(user.id, tokens.refreshToken);
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        roles: user.roles,
        tokens,
      };
    } catch (error) {
      this.logger.error(`Registration error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Login a user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { usernameOrEmail, password } = loginDto;
      
      // Find user by username or email
      const user = await this.userService.findByUsernameOrEmail(usernameOrEmail);
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is disabled');
      }
      
      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      // Generate tokens
      const tokens = await this.generateTokens(user.id);
      
      // Store refresh token
      await this.tokenService.saveRefreshToken(user.id, tokens.refreshToken);
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        roles: user.roles,
        tokens,
      };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const userId = await this.tokenService.validateRefreshToken(refreshToken);
      
      if (!userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Generate new tokens
      const tokens = await this.generateTokens(userId);
      
      // Update refresh token
      await this.tokenService.updateRefreshToken(userId, refreshToken, tokens.refreshToken);
      
      return tokens;
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.tokenService.revokeRefreshToken(refreshToken);
    } catch (error) {
      this.logger.error(`Logout error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async checkUsernameExists(username: string): Promise<boolean> {
    return this.userService.checkUsernameExists(username);
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    return this.userService.checkEmailExists(email);
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email);
    return user?.isEmailVerified || false;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Generate verification token
      const token = await this.tokenService.createEmailVerificationToken(user.id);
      
      // Send email
      const verificationUrl = `${this.configService.get('API_URL')}/auth/verify/email/${token}`;
      
      await this.emailService.sendVerificationEmail({
        to: user.email,
        username: user.username,
        verificationUrl,
      });
    } catch (error) {
      this.logger.error(`Send verification email error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // Validate token
      const userId = await this.tokenService.validateEmailVerificationToken(token);
      
      if (!userId) {
        throw new BadRequestException('Invalid or expired verification token');
      }
      
      // Update user
      await this.userService.updateEmailVerification(userId, true);
      
      // Invalidate token
      await this.tokenService.revokeEmailVerificationToken(token);
    } catch (error) {
      this.logger.error(`Verify email error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Generate reset token
      const token = await this.tokenService.createPasswordResetToken(user.id);
      
      // Send email
      const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;
      
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        resetUrl,
      });
    } catch (error) {
      this.logger.error(`Send password reset email error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Validate token
      const userId = await this.tokenService.validatePasswordResetToken(token);
      
      if (!userId) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      
      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update user password
      await this.userService.updatePassword(userId, hashedPassword);
      
      // Invalidate token
      await this.tokenService.revokePasswordResetToken(token);
      
      // Revoke all refresh tokens for this user (force re-login)
      await this.tokenService.revokeAllUserRefreshTokens(userId);
    } catch (error) {
      this.logger.error(`Reset password error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate JWT tokens (access and refresh)
   */
  private async generateTokens(userId: string): Promise<TokenResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId },
        {
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      ),
      uuidv4(), // Generate unique refresh token
    ]);
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getExpiresInSeconds(this.configService.get<string>('JWT_EXPIRES_IN', '1h')),
    };
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password with bcrypt
   */
  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Convert JWT expiration time to seconds
   */
  private getExpiresInSeconds(expiresIn: string): number {
    if (expiresIn.endsWith('s')) {
      return parseInt(expiresIn.slice(0, -1), 10);
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn.slice(0, -1), 10) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn.slice(0, -1), 10) * 60 * 60;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn.slice(0, -1), 10) * 24 * 60 * 60;
    }
    return 3600; // Default to 1 hour
  }
}
