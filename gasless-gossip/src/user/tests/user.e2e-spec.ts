// src/modules/user/tests/user.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { UserModule } from '../user.module';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auths/guards/jwt-auth.guard';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      // Mock the user in the request
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 'test-user-id', role: 'user' };
      return true;
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(getModelToken('User'))
      .useValue(mockUserModel)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    userService = moduleFixture.get<UserService>(UserService);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/users (POST) - should create a new user', () => {
    const createUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      displayName: 'Test User',
    };

    const expectedResponse = {
      id: 'test-id',
      username: createUserDto.username,
      displayName: createUserDto.displayName,
    };

    jest.spyOn(userService, 'create').mockResolvedValue(expectedResponse);

    return request(app.getHttpServer())
      .post('/users')
      .send(createUserDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual(expectedResponse);
      });
  });

  it('/users (POST) - should validate user input', () => {
    const invalidUserDto = {
      username: 'te', // Too short
      email: 'invalid-email',
      password: 'short', // Too short and missing requirements
    };

    return request(app.getHttpServer())
      .post('/users')
      .send(invalidUserDto)
      .expect(400);
  });

  it('/users/check-username/:username (GET) - should check username availability', () => {
    const username = 'testuser';
    const expectedResponse = { available: true };

    jest.spyOn(userService, 'isUsernameAvailable').mockResolvedValue(expectedResponse);

    return request(app.getHttpServer())
      .get(`/users/check-username/${username}`)
      .expect(200)
      .expect(expectedResponse);
  });

  // Add more e2e tests...
});
