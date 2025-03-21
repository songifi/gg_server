import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auths/guards/jwt-auth.guard';
import { UserSearchController } from '../user-search.controller';
import { UserSearchService } from '../user-search.service';
import { SearchField } from '../dto/search-user.dto';

describe('UserSearchController (e2e)', () => {
  let app: INestApplication;
  let userSearchService: UserSearchService;

  const mockUserSearchService = {
    searchUsers: jest.fn(),
    findByWalletAddress: jest.fn(),
    findByUsername: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 'test-user-id' };
      return true;
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          ttl: 60,
          limit: 10,
        }),
      ],
      controllers: [UserSearchController],
      providers: [
        {
          provide: UserSearchService,
          useValue: mockUserSearchService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    userSearchService = moduleFixture.get<UserSearchService>(UserSearchService);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/user-search (GET) - should search users', () => {
    const response = {
      results: [
        { id: 'user1', username: 'user1', displayName: 'User One' },
      ],
      total: 1,
      page: 1,
      pages: 1,
      query: 'test',
    };
    
    mockUserSearchService.searchUsers.mockResolvedValue(response);
    
    return request(app.getHttpServer())
      .get('/user-search?query=test&fields=username&fields=displayName')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(response);
        expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            fields: [SearchField.USERNAME, SearchField.DISPLAY_NAME],
            currentUserId: 'test-user-id',
            excludeUserId: 'test-user-id',
          }),
        );
      });
  });

  it('/user-search/wallet/:address (GET) - should find users by wallet address', () => {
    const walletAddress = '0x123';
    const users = [
      { id: 'user1', username: 'user1', displayName: 'User One' },
    ];
    
    mockUserSearchService.findByWalletAddress.mockResolvedValue(users);
    
    return request(app.getHttpServer())
      .get(`/user-search/wallet/${walletAddress}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(users);
        expect(mockUserSearchService.findByWalletAddress).toHaveBeenCalledWith(walletAddress);
      });
  });

  it('/user-search/username/:username (GET) - should find user by username', () => {
    const username = 'testuser';
    const user = { id: 'user1', username, displayName: 'Test User' };
    
    mockUserSearchService.findByUsername.mockResolvedValue(user);
    
    return request(app.getHttpServer())
      .get(`/user-search/username/${username}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(user);
        expect(mockUserSearchService.findByUsername).toHaveBeenCalledWith(username);
      });
  });
});
