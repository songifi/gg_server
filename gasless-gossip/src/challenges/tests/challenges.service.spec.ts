// src/modules/challenges/tests/challenges.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChallengesService } from '../challenges.service';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { ChallengeType } from '../enums/challenge-type.enum';
import { ChallengeStatus } from '../enums/challenge-status.enum';
import { ProgressStatus } from '../enums/progress-status.enum';
import { RewardType } from '../enums/reward-type.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChallengesService', () => {
  let service: ChallengesService;
  
  const mockChallengeModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-challenge-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-challenge-id',
        }),
      }),
    })),
  };
  
  const mockProgressModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-progress-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-progress-id',
        }),
      }),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        {
          provide: getModelToken('Challenge'),
          useValue: mockChallengeModel,
        },
        {
          provide: getModelToken('ChallengeProgress'),
          useValue: mockProgressModel,
        },
      ],
    }).compile();

    service = module.get<ChallengesService>(ChallengesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChallenge', () => {
    it('should create a permanent challenge', async () => {
      const createChallengeDto: CreateChallengeDto = {
        title: 'Test Challenge',
        description: 'This is a test challenge',
        type: ChallengeType.PERMANENT,
        criteria: {
          type: 'message_count',
          target: 100,
          description: 'Send 100 messages',
        },
        rewards: [
          {
            type: RewardType.BADGE,
            badgeId: 'test-badge',
            description: 'Test Badge',
          },
        ],
        startDate: new Date(),
      };

      const result = await service.createChallenge('admin-id', createChallengeDto);

      expect(mockChallengeModel.new).toHaveBeenCalledWith({
        ...createChallengeDto,
        status: ChallengeStatus.ACTIVE,
        createdBy: 'admin-id',
        participantCount: 0,
        completionCount: 0,
      });
      expect(result).toBeDefined();
      expect(result.title).toEqual(createChallengeDto.title);
    });

    it('should require end date for time-bound challenges', async () => {
      const createChallengeDto: CreateChallengeDto = {
        title: 'Test Challenge',
        description: 'This is a test challenge',
        type: ChallengeType.TIME_BOUND,
        criteria: {
          type: 'message_count',
          target: 100,
          description: 'Send 100 messages',
        },
        rewards: [],
        startDate: new Date(),
        // No endDate
      };

      await expect(service.createChallenge('admin-id', createChallengeDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('joinChallenge', () => {
    it('should join a challenge successfully', async () => {
      mockChallengeModel.findById.mockResolvedValueOnce({
        _id: 'challenge-id',
        status: ChallengeStatus.ACTIVE,
        criteria: {
          target: 100,
        },
      });
      
      mockProgressModel.findOne.mockResolvedValueOnce(null);
      
      const result = await service.joinChallenge('user-id', 'challenge-id');
      
      expect(mockProgressModel.new).toHaveBeenCalledWith({
        userId: 'user-id',
        challengeId: 'challenge-id',
        status: ProgressStatus.IN_PROGRESS,
        currentValue: 0,
        targetValue: 100,
        percentComplete: 0,
      });
      
      expect(mockChallengeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'challenge-id',
        { $inc: { participantCount: 1 } }
      );
      
      expect(result).toBeDefined();
    });
    
    it('should return existing progress if already joined', async () => {
      mockChallengeModel.findById.mockResolvedValueOnce({
        _id: 'challenge-id',
        status: ChallengeStatus.ACTIVE,
      });
      
      const existingProgress = {
        _id: 'progress-id',
        userId: 'user-id',
        challengeId: 'challenge-id',
        status: ProgressStatus.IN_PROGRESS,
        toObject: jest.fn().mockReturnValue({
          id: 'progress-id',
          userId: 'user-id',
          challengeId: 'challenge-id',
          status: ProgressStatus.IN_PROGRESS,
        }),
      };
      
      mockProgressModel.findOne.mockResolvedValueOnce(existingProgress);
      
      const result = await service.joinChallenge('user-id', 'challenge-id');
      
      expect(mockProgressModel.new).not.toHaveBeenCalled();
      expect(mockChallengeModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
    
    it('should throw error if challenge is not active', async () => {
      mockChallengeModel.findById.mockResolvedValueOnce({
        _id: 'challenge-id',
        status: ChallengeStatus.DRAFT,
      });
      
      await expect(service.joinChallenge('user-id', 'challenge-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProgress', () => {
    it('should update progress successfully', async () => {
      mockChallengeModel.findById.mockResolvedValueOnce({
        _id: 'challenge-id',
        status: ChallengeStatus.ACTIVE,
      });
      
      const progress = {
        _id: 'progress-id',
        userId: 'user-id',
        challengeId: 'challenge-id',
        status: ProgressStatus.IN_PROGRESS,
        currentValue: 10,
        targetValue: 100,
        percentComplete: 10,
        save: jest.fn().mockResolvedValue({
          _id: 'progress-id',
          userId: 'user-id',
          challengeId: 'challenge-id',
          status: ProgressStatus.IN_PROGRESS,
          currentValue: 50,
          targetValue: 100,
          percentComplete: 50,
          toObject: jest.fn().mockReturnValue({
            id: 'progress-id',
            userId: 'user-id',
            challengeId: 'challenge-id',
            status: ProgressStatus.IN_PROGRESS,
            currentValue: 50,
            targetValue: 100,
            percentComplete: 50,
          }),
        }),
      };
      
      mockProgressModel.findOne.mockResolvedValueOnce(progress);
      
      const result = await service.updateProgress('user-id', 'challenge-id', { currentValue: 50 });
      
      expect(progress.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.currentValue).toBe(50);
      expect(result.percentComplete).toBe(50);
    });
    
    it('should mark progress as completed when target reached', async () => {
      mockChallengeModel.findById.mockResolvedValueOnce({
        _id: 'challenge-id',
        status: ChallengeStatus.ACTIVE,
      });
      
      const now = new Date();
      const progress = {
        _id: 'progress-id',
        userId: 'user-id',
        challengeId: 'challenge-id',
        status: ProgressStatus.IN_PROGRESS,
        currentValue: 50,
        targetValue: 100,
        percentComplete: 50,
        save: jest.fn().mockImplementation(function() {
          return {
            ...this,
            toObject: jest.fn().mockReturnValue({
              id: 'progress-id',
              userId: 'user-id',
              challengeId: 'challenge-id',
              status: this.status,
              currentValue: this.currentValue,
              targetValue: this.targetValue,
              percentComplete: this.percentComplete,
              completedAt: this.completedAt,
            }),
          };
        }),
      };
      
      mockProgressModel.findOne.mockResolvedValueOnce(progress);
      mockChallengeModel.findByIdAndUpdate.mockResolvedValueOnce({});
      
      const result = await service.updateProgress('user-id', 'challenge-id', { currentValue: 100 });
      
      expect(progress.save).toHaveBeenCalled();
      expect(mockChallengeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'challenge-id',
        { $inc: { completionCount: 1 } }
      );
      
      expect(result).toBeDefined();
      expect(result.status).toBe(ProgressStatus.COMPLETED);
      expect(result.currentValue).toBe(100);
      expect(result.percentComplete).toBe(100);
      expect(result.completedAt).toBeDefined();
    });
  });
  
  // Add more test cases for other methods...
});
