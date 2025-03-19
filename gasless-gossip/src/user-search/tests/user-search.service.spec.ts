import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSearchService } from '../user-search.service';
import { SearchUserDto, SearchField, SortOrder } from '../dto/search-user.dto';
import { UserStatus } from '../../user/enums/user-status.enum';

describe('UserSearchService', () => {
  let service: UserSearchService;
  let userModel: Model<any>;
  let contactModel: Model<any>;

  const mockUserModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockContactModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSearchService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Contact'),
          useValue: mockContactModel,
        },
      ],
    }).compile();

    service = module.get<UserSearchService>(UserSearchService);
    userModel = module.get<Model<any>>(getModelToken('User'));
    contactModel = module.get<Model<any>>(getModelToken('Contact'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users with default parameters', async () => {
      const searchDto = new SearchUserDto();
      
      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'user1', username: 'user1', displayName: 'User One' },
          { _id: 'user2', username: 'user2', displayName: 'User Two' },
        ])
        .mockResolvedValueOnce([{ total: 2 }]);
      
      const result = await service.searchUsers(searchDto);
      
      expect(mockUserModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('should search users with query and fields', async () => {
      const searchDto = new SearchUserDto();
      searchDto.query = 'test';
      searchDto.fields = [SearchField.USERNAME, SearchField.DISPLAY_NAME];
      
      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'user1', username: 'test1', displayName: 'Test User' },
        ])
        .mockResolvedValueOnce([{ total: 1 }]);
      
      const result = await service.searchUsers(searchDto);
      
      expect(mockUserModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should include contact information when currentUserId is provided', async () => {
      const searchDto = new SearchUserDto();
      searchDto.currentUserId = 'currentUser';
      
      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'user1', username: 'user1' },
          { _id: 'user2', username: 'user2' },
        ])
        .mockResolvedValueOnce([{ total: 2 }]);
      
      mockContactModel.find.mockResolvedValue([
        { user: 'user1' },
      ]);
      
      const result = await service.searchUsers(searchDto);
      
      expect(mockContactModel.find).toHaveBeenCalledWith({
        owner: 'currentUser',
        status: 'active',
      });
      expect(result.results[0].isContact).toBe(true);
      expect(result.results[1].isContact).toBe(false);
    });
  });

  describe('findByWalletAddress', () => {
    it('should find users by wallet address', async () => {
      const walletAddress = '0x123';
      
      mockUserModel.find.mockResolvedValue([
        {
          _id: 'user1',
          username: 'user1',
          toObject: () => ({ _id: 'user1', username: 'user1' }),
        },
      ]);
      
      const result = await service.findByWalletAddress(walletAddress);
      
      expect(mockUserModel.find).toHaveBeenCalledWith({
        walletAddresses: walletAddress,
        status: UserStatus.ACTIVE,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByUsername', () => {
    it('should find user by exact username', async () => {
      const username = 'testuser';
      
      mockUserModel.findOne.mockResolvedValue({
        _id: 'user1',
        username,
        toObject: () => ({ _id: 'user1', username }),
      });
      
      const result = await service.findByUsername(username);
      
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        username,
        status: UserStatus.ACTIVE,
      });
      expect(result).not.toBeNull();
      expect(result.username).toBe(username);
    });

    it('should return null if user not found', async () => {
      const username = 'nonexistent';
      
      mockUserModel.findOne.mockResolvedValue(null);
      
      const result = await service.findByUsername(username);
      
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        username,
        status: UserStatus.ACTIVE,
      });
      expect(result).toBeNull();
    });
  });
});