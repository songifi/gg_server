// File: src/modules/users/test/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';
import { StorageService } from '../../storage/services/storage.service';
import { User } from '../entities/user.entity';
import { Model, Types } from 'mongoose';

describe('UserService', () => {
  let service: UserService;
  let userModel: Model<User>;
  let storageService: StorageService;

  const mockUserId = new Types.ObjectId().toString();
  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: false,
    save: jest.fn(),
    comparePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUser),
            constructor: jest.fn().mockResolvedValue(mockUser),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            deleteOne: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('user-avatars'),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    storageService = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'Password123!',
        name: 'New User',
      };

      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(userModel.prototype, 'save').mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        username: createUserDto.username,
        name: createUserDto.name,
      });

      const result = await service.create(createUserDto);
      expect(result.email).toBe(createUserDto.email);
      expect(result.username).toBe(createUserDto.username);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'Password123!',
        name: 'New User',
      };

      jest.spyOn(userModel, 'findOne').mockResolvedValueOnce({} as any);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return a user if found', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findById(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findById('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto = {
        name: 'Updated Name',
        bio: 'New bio',
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          name: updateProfileDto.name,
          bio: updateProfileDto.bio,
        }),
      } as any);

      const result = await service.updateProfile(mockUserId, updateProfileDto);
      expect(result.name).toBe(updateProfileDto.name);
      expect(result.bio).toBe(updateProfileDto.bio);
    });

    it('should check username uniqueness when updating', async () => {
      const updateProfileDto = {
        username: 'newusername',
      };

      jest.spyOn(service, 'findById').mockResolvedValue({
        ...mockUser,
        username: 'oldusername',
      } as any);
      
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ username: 'newusername' }),
      } as any);

      await expect(service.updateProfile(mockUserId, updateProfileDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and update user', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const newAvatarUrl = 'https://example.com/new-avatar.jpg';

      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(storageService, 'uploadFile').mockResolvedValue(newAvatarUrl);
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          avatarUrl: newAvatarUrl,
        }),
      } as any);

      const result = await service.uploadAvatar(mockUserId, mockFile);
      expect(result.avatarUrl).toBe(newAvatarUrl);
    });
  });

  // Add more tests for other methods...
});
