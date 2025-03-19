import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeaderboardService } from '../leaderboard.service';
import { LeaderboardCategory } from '../enums/leaderboard-category.enum';
import { TimePeriod } from '../enums/time-period.enum';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  
  // Mock models
  const mockTransactionStatsModel = {
    findOne: jest.fn(),
    new: jest.fn(),
    aggregate: jest.fn(),
  };
  
  const mockDailyStatsModel = {
    findOne: jest.fn(),
    distinct: jest.fn(),
    new: jest.fn(),
    aggregate: jest.fn(),
  };
  
  const mockLeaderboardCacheModel = {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    new: jest.fn(),
  };
  
  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken('TransactionStats'),
          useValue: mockTransactionStatsModel,
        },
        {
          provide: getModelToken('DailyStats'),
          useValue: mockDailyStatsModel,
        },
        {
          provide: getModelToken('LeaderboardCache'),
          useValue: mockLeaderboardCacheModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackTransaction', () => {
    it('should update user stats and daily stats', async () => {
      // Mock existing stats
      const mockStats = {
        userId: 'user1',
        totalValue: 100,
        transactionCount: 5,
        tokenCount: 10,
        recipientCount: 2,
        streak: 1,
        longestStreak: 1,
        lastTransactionDate: new Date(),
        save: jest.fn().mockResolvedValue({}),
      };
      
      const mockDailyStats = {
        userId: 'user1',
        date: new Date(),
        totalValue: 50,
        transactionCount: 3,
        tokenCount: 6,
        recipientCount: 1,
        save: jest.fn().mockResolvedValue({}),
      };
      
      mockTransactionStatsModel.findOne.mockResolvedValue(mockStats);
      mockDailyStatsModel.findOne.mockResolvedValue(mockDailyStats);
      mockDailyStatsModel.distinct.mockResolvedValue([]);
      
      // Call trackTransaction with test data
      await service.trackTransaction({
        senderId: 'user1',
        recipientId: 'user2',
        tokenAddress: '0x123',
        value: 25,
        tokenCount: 2,
        timestamp: new Date(),
      });
      
      // Verify stats were updated
      expect(mockTransactionStatsModel.findOne).toHaveBeenCalledWith({ userId: 'user1' });
      expect(mockStats.save).toHaveBeenCalled();
      expect(mockDailyStats.save).toHaveBeenCalled();
      
      // Verify cache invalidation
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('leaderboard.cache.invalidated');
    });
    
    it('should create new stats if none exist', async () => {
      // Mock empty results
      mockTransactionStatsModel.findOne.mockResolvedValue(null);
      mockDailyStatsModel.findOne.mockResolvedValue(null);
      mockDailyStatsModel.distinct.mockResolvedValue([]);
      
      // Mock new models
      const mockNewStats = {
        save: jest.fn().mockResolvedValue({}),
      };
      
      const mockNewDailyStats = {
        save: jest.fn().mockResolvedValue({}),
      };
      
      mockTransactionStatsModel.new.mockReturnValue(mockNewStats);
      mockDailyStatsModel.new.mockReturnValue(mockNewDailyStats);
      
      // Call trackTransaction with test data
      await service.trackTransaction({
        senderId: 'user1',
        recipientId: 'user2',
        tokenAddress: '0x123',
        value: 25,
        tokenCount: 2,
        timestamp: new Date(),
      });
      
      // Verify new stats were created
      expect(mockTransactionStatsModel.new).toHaveBeenCalled();
      expect(mockDailyStatsModel.new).toHaveBeenCalled();
      expect(mockNewStats.save).toHaveBeenCalled();
      expect(mockNewDailyStats.save).toHaveBeenCalled();
    });
  });
  
  describe('getLeaderboard', () => {
    it('should return cached leaderboard if available', async () => {
      // Mock cached leaderboard
      const mockCache = {
        category: LeaderboardCategory.MOST_VALUE_SENT,
        period: TimePeriod.ALL_TIME,
        createdAt: new Date(),
        entries: [
          { userId: 'user1', username: 'user1', displayName: 'User 1', value: 100, rank: 1 },
          { userId: 'user2', username: 'user2', displayName: 'User 2', value: 75, rank: 2 },
        ],
      };
      
      mockLeaderboardCacheModel.findOne.mockResolvedValue(mockCache);
      
      // Get leaderboard
      const result = await service.getLeaderboard(
        LeaderboardCategory.MOST_VALUE_SENT,
        TimePeriod.ALL_TIME,
        10
      );
      
      // Verify cache was used
      expect(mockLeaderboardCacheModel.findOne).toHaveBeenCalled();
      expect(result.entries).toHaveLength(2);
      expect(result.category).toBe(LeaderboardCategory.MOST_VALUE_SENT);
      expect(result.period).toBe(TimePeriod.ALL_TIME);
    });
    
    it('should generate new leaderboard if no cache exists', async () => {
      // Mock empty cache
      mockLeaderboardCacheModel.findOne.mockResolvedValue(null);
      
      // Mock aggregate results
      mockTransactionStatsModel.aggregate.mockResolvedValue([
        { userId: 'user1', value: 100 },
        { userId: 'user2', value: 75 },
      ]);
      
      // Mock cache creation
      const mockNewCache = {
        save: jest.fn().mockResolvedValue({}),
      };
      
      mockLeaderboardCacheModel.new.mockReturnValue(mockNewCache);
      mockLeaderboardCacheModel.deleteOne.mockResolvedValue({ deletedCount: 0 });
      
      // Get leaderboard
      const result = await service.getLeaderboard(
        LeaderboardCategory.MOST_VALUE_SENT,
        TimePeriod.ALL_TIME,
        10
      );
      
      // Verify leaderboard was generated
      expect(mockTransactionStatsModel.aggregate).toHaveBeenCalled();
      expect(mockLeaderboardCacheModel.new).toHaveBeenCalled();
      expect(mockNewCache.save).toHaveBeenCalled();
      expect(result.entries).toHaveLength(2);
    });
  });
  
  describe('getUserStats', () => {
    it('should return user stats with rankings', async () => {
      // Mock user stats
      const mockStats = {
        userId: 'user1',
        totalValue: 100,
        transactionCount: 5,
        averageValue: 20,
        recipientCount: 3,
        tokenCount: 10,
        streak: 2,
        longestStreak: 3,
        toObject: () => ({
          userId: 'user1',
          totalValue: 100,
          transactionCount: 5,
          averageValue: 20,
          recipientCount: 3,
          tokenCount: 10,
          streak: 2,
          longestStreak: 3,
        }),
      };
      
      mockTransactionStatsModel.findOne.mockResolvedValue(mockStats);
      
      // Mock getLeaderboard to return sample rankings
      jest.spyOn(service, 'getLeaderboard').mockImplementation(() => {
        return Promise.resolve({
          category: LeaderboardCategory.MOST_VALUE_SENT,
          period: TimePeriod.ALL_TIME,
          lastUpdated: new Date(),
          entries: [
            { userId: 'user2', username: 'user2', displayName: 'User 2', value: 200, rank: 1 },
            { userId: 'user1', username: 'user1', displayName: 'User 1', value: 100, rank: 2 },
          ],
        });
      });
      
      // Get user stats
      const result = await service.getUserStats('user1');
      
      // Verify stats were returned
      expect(mockTransactionStatsModel.findOne).toHaveBeenCalledWith({ userId: 'user1' });
      expect(result.userId).toBe('user1');
      expect(result.totalValue).toBe(100);
      expect(result.rankings).toBeDefined();
    });
  });
});
