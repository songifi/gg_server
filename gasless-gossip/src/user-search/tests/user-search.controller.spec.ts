import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchController } from '../user-search.controller';
import { UserSearchService } from '../user-search.service';
import { SearchUserDto } from '../dto/search-user.dto';
import { UserSearchResponseDto } from '../dto/user-search-response.dto';

describe('UserSearchController', () => {
  let controller: UserSearchController;
  let service: UserSearchService;

  const mockUserSearchService = {
    searchUsers: jest.fn(),
    findByWalletAddress: jest.fn(),
    findByUsername: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSearchController],
      providers: [
        {
          provide: UserSearchService,
          useValue: mockUserSearchService,
        },
      ],
    }).compile();

    controller = module.get<UserSearchController>(UserSearchController);
    service = module.get<UserSearchService>(UserSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users and pass current user ID', async () => {
      const searchDto = new SearchUserDto();
      const req = { user: { userId: 'currentUser' } };
      
      const response: UserSearchResponseDto = {
        results: [
          { id: 'user1', username: 'user1', displayName: 'User One' },
        ],
        total: 1,
        page: 1,
        pages: 1,
        query: '',
      };
      
      mockUserSearchService.searchUsers.mockResolvedValue(response);
      
      const result = await controller.searchUsers(searchDto, req);
      
      expect(searchDto.currentUserId).toBe('currentUser');
      expect(searchDto.excludeUserId).toBe('currentUser');
      expect(service.searchUsers).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(response);
    });
  });

  describe('findByWalletAddress', () => {
    it('should find users by wallet address', async () => {
      const walletAddress = '0x123';
      const users = [
        { id: 'user1', username: 'user1', displayName: 'User One' },
      ];
      
      mockUserSearchService.findByWalletAddress.mockResolvedValue(users);
      
      const result = await controller.findByWalletAddress(walletAddress);
      
      expect(service.findByWalletAddress).toHaveBeenCalledWith(walletAddress);
      expect(result).toEqual(users);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const username = 'testuser';
      const user = { id: 'user1', username, displayName: 'Test User' };
      
      mockUserSearchService.findByUsername.mockResolvedValue(user);
      
      const result = await controller.findByUsername(username);
      
      expect(service.findByUsername).toHaveBeenCalledWith(username);
      expect(result).toEqual(user);
    });
  });
});