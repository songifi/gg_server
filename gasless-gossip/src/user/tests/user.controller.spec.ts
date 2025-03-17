// src/modules/user/tests/user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { BadRequestException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    isUsernameAvailable: jest.fn(),
    findByWalletAddress: jest.fn(),
    getProfile: jest.fn(),
    searchUsers: jest.fn(),
    associateWalletAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
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
      };

      const expectedResult = new UserResponseDto({
        id: 'someId',
        username: createUserDto.username,
        email: createUserDto.email,
      });

      mockUserService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const expectedResult = {
        users: [new UserResponseDto({ id: 'someId', username: 'testuser' })],
        total: 1,
        page: 1,
        pages: 1,
      };

      mockUserService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(1, 10);

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException for invalid page', async () => {
      await expect(controller.findAll(0, 10)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(controller.findAll(1, 0)).rejects.toThrow(BadRequestException);
      await expect(controller.findAll(1, 101)).rejects.toThrow(BadRequestException);
    });
  });

  // Add more tests for other controller methods...
});
