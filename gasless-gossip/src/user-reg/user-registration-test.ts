// src/modules/user/tests/user-registration.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UserRegistrationService } from '../services/user-registration.service';
import { User } from '../schemas/user.schema';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(() => 'hashed_password'),
}));

describe('UserRegistrationService', () => {
  let service: UserRegistrationService;
  let mockUserModel;
  let mockEventEmitter;

  const mockUser = {
    _id: 'user_id',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed_password',
    emailVerified: false,
    emailVerificationToken: 'token123',
    emailVerificationTokenExpires: new Date(Date.now() + 86400000), // 24 hours from now
    registeredAt: new Date(),
    toObject: jest.fn().mockReturnValue({
      _id: 'user_id',
      email: 'test@example.com',
      username: 'testuser',
      emailVerified: false,
    }),
    save: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      new: jest.fn().mockResolvedValue(mockUser),
      constructor: jest.fn().mockResolvedValue(mockUser),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRegistrationService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'BCRYPT_SALT_ROUNDS') return 10;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UserRegistrationService>(UserRegistrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerUser', () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'StrongP@ss123',
    };

    it('should register a new user successfully', async () => {
      // Mock findOne to return null (no existing user)
      mockUserModel.findOne = jest.fn().mockResolvedValue(null);
      
      const result = await service.registerUser(registerDto);
      
      // Verify password was hashed
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      
      // Verify user was saved
      expect(mockUser.save).toHaveBeenCalled();
      
      // Verify event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.registered',
        expect.any(Object)
      );
      
      // Check returned user
      expect(result).toEqual({
        _id: 'user_id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      // Mock findOne to return existing user with same email
      mockUserModel.findOne.mockResolvedValueOnce(mockUser);
      
      await expect(service.registerUser(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username already exists', async () => {
      // Mock findOne to return null for email check, then return user for username check
      mockUserModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockUser);
      
      await expect(service.registerUser(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const invalidEmailDto = {
        ...registerDto,
        email: 'invalid-email',
      };
      
      await expect(service.registerUser(invalidEmailDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid username format', async () => {
      mockUserModel.findOne = jest.fn().mockResolvedValue(null);
      
      const invalidUsernameDto = {
        ...registerDto,
        username: 'user with spaces',
      };
      
      await expect(service.registerUser(invalidUsernameDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid-token';

    it('should verify email successfully', async () => {
      // Mock findOne to return user with matching token
      mockUserModel.findOne = jest.fn().mockResolvedValue({
        ...mockUser,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: new Date(Date.now() + 3600000), // Not expired
        save: jest.fn().mockResolvedValue(true),
      });
      
      const result = await service.verifyEmail(verificationToken);
      
      // Verify user was updated and saved
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: expect.any(Object),
      });
      
      // Verify event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.emailVerified',
        expect.any(Object)
      );
      
      expect(result).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Mock findOne to return null (no user with this token)
      mockUserModel.findOne = jest.fn().mockResolvedValue(null);
      
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true if username is available', async () => {
      // Mock findOne to return null (no existing user with this username)
      mockUserModel.findOne = jest.fn().mockResolvedValue(null);
      
      const result = await service.isUsernameAvailable('newusername');
      
      expect(result).toBe(true);
    });

    it('should return false if username is taken', async () => {
      // Mock findOne to return user (username exists)
      mockUserModel.findOne = jest.fn().mockResolvedValue(mockUser);
      
      const result = await service.isUsernameAvailable('testuser');
      
      expect(result).toBe(false);
    });

    it('should return false if username format is invalid', async () => {
      const result = await service.isUsernameAvailable('invalid username');
      
      expect(result).toBe(false);
    });
  });
});
