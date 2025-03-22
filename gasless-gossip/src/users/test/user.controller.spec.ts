// File: src/modules/users/test/user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUser = {
    _id: '60d21b4667d0d8992e610c85',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByUsername: jest.fn(),
            updateProfile: jest.fn(),
            uploadAvatar: jest.fn(),
            uploadCoverImage: jest.fn(),
            changePassword: jest.fn(),
            deleteUser: jest.fn(),
            updateLastActive: jest.fn(),
            isUsernameAvailable: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'Password123!',
        name: 'New User',
      };

      jest.spyOn(userService, 'create').mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        username: createUserDto.username,
        name: createUserDto.name,
      } as any);

      const result = await controller.createUser(createUserDto);
      expect(result.email).toBe(createUserDto.email);
      expect(result.username).toBe(createUserDto.username);
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user profile', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(userService, 'updateLastActive').mockResolvedValue(undefined);

      const result = await controller.getCurrentUser(mockUser._id);
      expect(result.id).toBe(mockUser._id);
      expect(userService.updateLastActive).toHaveBeenCalledWith(mockUser._id);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        name: 'Updated Name',
        bio: 'New bio',
      };

      jest.spyOn(userService, 'updateProfile').mockResolvedValue({
        ...mockUser,
        name: updateProfileDto.name,
        bio: updateProfileDto.bio,
      } as any);

      const result = await controller.updateProfile(mockUser._id, updateProfileDto);
      expect(result.name).toBe(updateProfileDto.name);
      expect(result.bio).toBe(updateProfileDto.bio);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const newAvatarUrl = 'https://example.com/new-avatar.jpg';

      jest.spyOn(userService, 'uploadAvatar').mockResolvedValue({
        ...mockUser,
        avatarUrl: newAvatarUrl,
      } as any);

      const result = await controller.uploadAvatar(mockUser._id, mockFile);
      expect(result.avatarUrl).toBe(newAvatarUrl);
    });

    it('should throw error if no file is provided', async () => {
      await expect(controller.uploadAvatar(mockUser._id, null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid file type', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      await expect(controller.uploadAvatar(mockUser._id, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for file too large', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      await expect(controller.uploadAvatar(mockUser._id, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Add more tests for other methods...
});
