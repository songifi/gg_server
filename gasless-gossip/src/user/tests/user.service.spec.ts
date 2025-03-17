// src/modules/user/tests/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../user.service';
import { UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

describe('UserService', () => {
  let service: UserService;
  let model: Model<UserDocument>;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    new: jest.fn().mockResolvedValue({
      save: jest.fn(),
      toObject: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    model = module.get<Model<UserDocument>>(getModelToken('User'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      };

      mockUserModel.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // email check

      const mockUser = {
        _id: 'someId',
        username: createUserDto.username,
        email: createUserDto.email,
        displayName: createUserDto.displayName,
        toObject: jest.fn().mockReturnValue({
          _id: 'someId',
          username: createUserDto.username,
          email: createUserDto.email,
          displayName: createUserDto.displayName,
        }),
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue({
            _id: 'someId',
            username: createUserDto.username,
            email: createUserDto.email,
            displayName: createUserDto.displayName,
          }),
        }),
      };

      jest.spyOn(mockUserModel, 'new').mockReturnValue(mockUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockUserModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.username).toEqual(createUserDto.username);
    });

    it('should throw ConflictException if username exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockUserModel.findOne.mockResolvedValueOnce({ username: 'existinguser' });

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      mockUserModel.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ email: 'existing@example.com' }); // email check

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  // Add more tests for other methods...
});