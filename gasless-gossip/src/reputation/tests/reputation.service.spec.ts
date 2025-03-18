import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReputationService } from '../reputation.service';
import { ReputationFactor } from '../enums/reputation-factor.enum';
import { ReputationLevel } from '../enums/reputation-level.enum';

describe('ReputationService', () => {
  let service: ReputationService;
  
  // Mock models
  const mockReputationModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-reputation-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-reputation-id',
        }),
      }),
    })),
  };
  
  const mockHistoryModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-history-id',
      }),
    })),
  };
  
  const mockSettingsModel = {
    findOne: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      factorWeights: {
        messageActivity: 20,
        tokenTransfers: 20,
        challengeCompletion: 15,
        peerRatings: 20,
        accountAge: 5,
        contentQuality: 10,
        achievementPoints: 10
      },
      levelThresholds: {
        newcomer: 0,
        regular: 100,
        established: 300,
        trusted: 600,
        veteran: 1000,
        elite: 2000
      },
      decayEnabled: true,
      decayRate: 1,
      maxScore: 5000,
      minScore: 0,
      isActive: true,
      save: jest.fn().mockReturnThis(),
    })),
  };
  
  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        {
          provide: getModelToken('Reputation'),
          useValue: mockReputationModel,
        },
        {
          provide: getModelToken('ReputationHistory'),
          useValue: mockHistoryModel,
        },
        {
          provide: getModelToken('ReputationSettings'),
          useValue: mockSettingsModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
    
    // Mock settings retrieval
    mockSettingsModel.findOne.mockResolvedValue({
      factorWeights: {
        messageActivity: 20,
        tokenTransfers: 20,
        challengeCompletion: 15,
        peerRatings: 20,
        accountAge: 5,
        contentQuality: 10,
        achievementPoints: 10
      },
      levelThresholds: {
        newcomer: 0,
        regular: 100,
        established: 300,
        trusted: 600,
        veteran: 1000,
        elite: 2000
      },
      decayEnabled: true,
      decayRate: 1,
      maxScore: 5000,
      minScore: 0,
      isActive: true,
      save: jest.fn().mockReturnThis(),
    });
    
    // Load settings
    await service['loadSettings']();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateReputation', () => {
    it('should create new reputation record if none exists', async () => {
      // Mock empty response for existing reputation
      mockReputationModel.findOne.mockResolvedValue(null);
      
      const result = await service.updateReputation(
        'user-id',
        ReputationFactor.MESSAGE_ACTIVITY,
        10,
        'Test reason'
      );
      
      expect(mockReputationModel.findOne).toHaveBeenCalledWith({ userId: 'user-id' });
      expect(mockReputationModel.new).toHaveBeenCalled();
      expect(mockHistoryModel.new).toHaveBeenCalled();
      
      // Emitter should not be called since level didn't change
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
    
    it('should update existing reputation record', async () => {
      // Mock existing reputation
      const mockReputation = {
        userId: 'user-id',
        score: 50,
        level: ReputationLevel.NEWCOMER,
        metrics: {
          messageActivity: 20,
          tokenTransfers: 10,
          challengeCompletion: 5,
          peerRatings: 10,
          accountAge: 5,
          contentQuality: 0,
          achievementPoints: 0
        },
        lastUpdated: new Date(),
        save: jest.fn().mockImplementation(function() {
          return {
            ...this,
            toObject: () => ({
              ...this,
              id: 'reputation-id'
            })
          };
        })
      };
      
      mockReputationModel.findOne.mockResolvedValue(mockReputation);
      
      const result = await service.updateReputation(
        'user-id',
        ReputationFactor.MESSAGE_ACTIVITY,
        10,
        'Test reason'
      );
      
      expect(mockReputation.save).toHaveBeenCalled();
      expect(mockHistoryModel.new).toHaveBeenCalled();
      
      // Verify metric was updated
      expect(mockReputation.metrics.messageActivity).toBe(30); // 20 + 10
    });
    
    it('should emit event when level changes', async () => {
      // Mock reputation near level threshold
      const mockReputation = {
        userId: 'user-id',
        score: 95,
        level: ReputationLevel.NEWCOMER,
        metrics: {
          messageActivity: 40,
          tokenTransfers: 10,
          challengeCompletion: 5,
          peerRatings: 10,
          accountAge: 5,
          contentQuality: 0,
          achievementPoints: 0
        },
        lastUpdated: new Date(),
        save: jest.fn().mockImplementation(function() {
          // Update level based on new score
          this.level = ReputationLevel.REGULAR;
          return {
            ...this,
            toObject: () => ({
              ...this,
              id: 'reputation-id'
            })
          };
        })
      };
      
      mockReputationModel.findOne.mockResolvedValue(mockReputation);
      
      await service.updateReputation(
        'user-id',
        ReputationFactor.MESSAGE_ACTIVITY,
        10,
        'Test reason'
      );
      
      // Event should be emitted for level change
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reputation.levelChanged',
        expect.objectContaining({
          userId: 'user-id',
          oldLevel: ReputationLevel.NEWCOMER,
          newLevel: ReputationLevel.REGULAR,
        })
      );
    });
  });
  
  describe('getUserReputation', () => {
    it('should return default reputation if none exists', async () => {
      mockReputationModel.findOne.mockResolvedValue(null);
      
      const result = await service.getUserReputation('user-id');
      
      expect(result.score).toBe(0);
      expect(result.level).toBe(ReputationLevel.NEWCOMER);
      expect(result.nextLevel).toBeDefined();
      expect(result.nextLevel.name).toBe(ReputationLevel.REGULAR);
    });
    
    it('should return existing reputation with next level info', async () => {
      const mockReputation = {
        userId: 'user-id',
        score: 200,
        level: ReputationLevel.REGULAR,
        metrics: {
          messageActivity: 60,
          tokenTransfers: 40,
          challengeCompletion: 20,
          peerRatings: 40,
          accountAge: 20,
          contentQuality: 10,
          achievementPoints: 10
        },
        lastUpdated: new Date(),
        toObject: () => ({
          userId: 'user-id',
          score: 200,
          level: ReputationLevel.REGULAR,
          metrics: {
            messageActivity: 60,
            tokenTransfers: 40,
            challengeCompletion: 20,
            peerRatings: 40,
            accountAge: 20,
            contentQuality: 10,
            achievementPoints: 10
          },
          lastUpdated: new Date(),
        })
      };
      
      mockReputationModel.findOne.mockResolvedValue(mockReputation);
      
      const result = await service.getUserReputation('user-id');
      
      expect(result.score).toBe(200);
      expect(result.level).toBe(ReputationLevel.REGULAR);
      expect(result.nextLevel).toBeDefined();
      expect(result.nextLevel.name).toBe(ReputationLevel.ESTABLISHED);
      expect(result.nextLevel.pointsNeeded).toBe(100); // 300 - 200
    });
  });
  
  describe('event handlers', () => {
    beforeEach(() => {
      // Mock successful reputation update
      jest.spyOn(service, 'updateReputation').mockResolvedValue(null);
    });
    
    it('should handle message.sent event', async () => {
      await service.handleMessageSent({
        userId: 'user-id',
        messageId: 'message-id'
      });
      
      expect(service.updateReputation).toHaveBeenCalledWith(
        'user-id',
        ReputationFactor.MESSAGE_ACTIVITY,
        1,
        'Sent a message',
        { messageId: 'message-id' }
      );
    });
    
    it('should handle token.transferred event', async () => {
      await service.handleTokenTransferred({
        userId: 'user-id',
        amount: '100',
        tokenAddress: '0x123',
        transactionHash: 'tx-hash'
      });
      
      expect(service.updateReputation).toHaveBeenCalledWith(
        'user-id',
        ReputationFactor.TOKEN_TRANSFERS,
        2,
        'Successful token transfer',
        expect.objectContaining({
          amount: '100',
          tokenAddress: '0x123',
          transactionHash: 'tx-hash'
        })
      );
    });
    
    it('should handle challenge.completed event', async () => {
      await service.handleChallengeCompleted({
        userId: 'user-id',
        challengeId: 'challenge-id'
      });
      
      expect(service.updateReputation).toHaveBeenCalledWith(
        'user-id',
        ReputationFactor.CHALLENGE_COMPLETION,
        10,
        'Completed a challenge',
        { challengeId: 'challenge-id' }
      );
    });
    
    it('should handle user.rated event with appropriate points', async () => {
      await service.handleUserRated({
        targetUserId: 'user-id',
        ratingUserId: 'rater-id',
        rating: 5, // 5 star rating
        context: 'test-context'
      });
      
      expect(service.updateReputation).toHaveBeenCalledWith(
        'user-id',
        ReputationFactor.PEER_RATINGS,
        10, // 5 stars = 10 points
        'Received user rating',
        expect.objectContaining({
          fromUserId: 'rater-id',
          rating: 5
        })
      );
    });
  });
  
  // Additional test cases...
});
