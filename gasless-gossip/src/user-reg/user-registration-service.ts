// src/modules/user/services/user-registration.service.ts
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';

import { User } from '../schemas/user.schema';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UserRegisteredEvent } from '../events/user-registered.event';

@Injectable()
export class UserRegistrationService {
  private readonly SALT_ROUNDS = 10;
  
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    // Get salt rounds from config or use default
    const configSaltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    if (configSaltRounds) {
      this.SALT_ROUNDS = configSaltRounds;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, username, password } = registerUserDto;
    
    // Validate and normalize email
    const normalizedEmail = this.normalizeEmail(email);
    if (!this.isValidEmail(normalizedEmail)) {
      throw new BadRequestException('Invalid email format');
    }
    
    // Check if email already exists
    const existingEmail = await this.userModel.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }
    
    // Check if username already exists
    const existingUsername = await this.userModel.findOne({ username });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }
    
    // Check username format
    if (!this.isValidUsername(username)) {
      throw new BadRequestException('Invalid username format. Username must be 3-30 characters and contain only letters, numbers, and underscores.');
    }
    
    // Hash the password
    const hashedPassword = await this.hashPassword(password);
    
    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 24); // 24 hour expiration
    
    // Create new user document
    const newUser = new this.userModel({
      email: normalizedEmail,
      username,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: tokenExpiration,
      registeredAt: new Date(),
      lastLoginAt: null,
    });
    
    // Save the new user
    const savedUser = await newUser.save();
    
    // Emit user registered event
    this.eventEmitter.emit(
      'user.registered',
      new UserRegisteredEvent(savedUser._id.toString(), normalizedEmail, username, verificationToken)
    );
    
    // Return user without sensitive data
    return this.sanitizeUser(savedUser);
  }

  /**
   * Verify a user's email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    // Find user with this verification token
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() } // Token not expired
    });
    
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    
    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    
    await user.save();
    
    // Emit email verified event
    this.eventEmitter.emit('user.emailVerified', {
      userId: user._id.toString(),
      email: user.email
    });
    
    return true;
  }

  /**
   * Check if a username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!this.isValidUsername(username)) {
      return false;
    }
    
    const existingUser = await this.userModel.findOne({ username });
    return !existingUser;
  }

  /**
   * Hash a password with bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Generate a verification token
   */
  private generateVerificationToken(): string {
    return uuidv4();
  }
  
  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return isEmail(email);
  }
  
  /**
   * Normalize email (lowercase, trim)
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
  
  /**
   * Validate username format
   */
  private isValidUsername(username: string): boolean {
    // Username requirements: 3-30 chars, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }
  
  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): User {
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.emailVerificationToken;
    delete userObject.emailVerificationTokenExpires;
    return userObject;
  }
}
