// src/modules/achievements/tests/achievements.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AchievementsService } from '../achievements.service';
import { CreateAchievementDto } from '../dto/create-achievement.dto';
import { AchievementType } from '../enums/achievement-type.enum';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementRarity } from '../enums/achievement-rarity.enum';
import { NotFoundException } from '@nestjs/common';

describe('AchievementsService', () => {
  let service: AchievementsService;
  
  const mockAchievementModel = {
    find: jest.fn(),
    findById: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-achievement-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-achievement-id',
        }),
      }),
    })),
  };
  
  const mockBadgeModel = {
    find: jest.fn(),
    findById: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-badge-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-badge-id',
        }),
      }),
    })),
  };
  
  const mockUserAchievementModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-user-achievement-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-user-achievement-id',
        }),
      }),
    })),
  };
  
  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        {
          provide: getModelToken('Achievement'),
          useValue: mockAchievementModel,
        },
        {
          provide: getModelToken('Badge'),
          useValue: mockBadgeModel,
        },
        {
          provide: getModelToken('UserAchievement'),
          useValue: mockUserAchievementModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAchievement', () => {
    it('should create a new achievement', async () => {
      const createAchievementDto: CreateAchievementDto = {
        title: 'Test Achievement',
        description: 'This is a test achievement',
        type: AchievementType.MILESTONE,
        category: AchievementCategory.MESSAGING,
        rarity: AchievementRarity.COMMON,
        points: 10,
        badgeId: 'test-badge-id',
        criteria: {
          type: 'message_count',
          target: 100,
          progressTrackable: true,
        },
      };

      const mockBadge = {
        _id: 'test-badge-id',
        name: 'Test Badge',
        description: 'Test Badge Description',
        imageUrl: 'test-image-url',
        save: jest.fn().mockResolvedValue({
          _id: 'test-badge-id',
          achievementId: 'test-achievement-id',
        }),
        toObject: jest.fn().mockReturnValue({
          id: 'test-badge-id',
          name: 'Test Badge',
          description: 'Test Badge Description',
          imageUrl: 'test-image-url',
        }),
      };

      mockBadgeModel.findById.mockResolvedValue(mockBadge);

      const result = await service.createAchievement(createAchievementDto);

      expect(mockBadgeModel.findById).toHaveBeenCalledWith('test-badge-id');
      expect(mockAchievementModel.new).toHaveBeenCalledWith(createAchievementDto);
      expect(mockBadge.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toEqual(createAchievementDto.title);
      expect(result.badge).toBeDefined();
    });

    it('should throw NotFoundException if badge not found', async () => {
      const createAchievementDto: CreateAchievementDto = {
        title: 'Test Achievement',
        description: 'This is a test achievement',
        type: AchievementType.MILESTONE,
        category: AchievementCategory.MESSAGING,
        rarity: AchievementRarity.COMMON,
        points: 10,
        badgeId: 'nonexistent-badge-id',
        criteria: {
          type: 'message_count',
          target: 100,
          progressTrackable: true,
        },
      };

      mockBadgeModel.findById.mockResolvedValue(null);

      await expect(service.createAchievement(createAchievementDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('trackActivity', () => {
    it('should track user activity and update progress', async () => {
      // Mock the achievement
      const mockAchievement = {
        _id: 'achievement-id',
        criteria: {
          type: 'message_count',
          target: 10,
          progressTrackable: true,
        },
        badgeId: 'badge-id',
      };
      
      mockAchievementModel.find.mockResolvedValue([mockAchievement]);
      
      // Mock user achievement (not yet completed)
      const mockUserAchievement = {
        _id: 'user-achievement-id',
        userId: 'user-id',
        achievementId: 'achievement-id',
        progress: 5,
        target: 10,
        percentComplete: 50,
        isCompleted: false,
        save: jest.fn().mockImplementation(function() {
          return {
            ...this,
            _id: 'user-achievement-id',
          };
        }),
      };
      
      mockUserAchievementModel.findOne.mockResolvedValue(mockUserAchievement);
      
      // Execute the tracking
      await service.trackActivity('user-id', 'message_count', 3);
      
      // Assertions
      expect(mockAchievementModel.find).toHaveBeenCalledWith({
        'criteria.type': 'message_count',
      });
      
      expect(mockUserAchievementModel.findOne).toHaveBeenCalledWith({
        userId: 'user-id',
        achievementId: 'achievement-id',
      });
      
      expect(mockUserAchievement.save).toHaveBeenCalled();
      expect(mockUserAchievement.progress).toBe(8);
      expect(mockUserAchievement.percentComplete).toBe(80);
      expect(mockUserAchievement.isCompleted).toBe(false);
    });
    
    it('should complete achievement when progress reaches target', async () => {
      // Mock the achievement
      const mockAchievement = {
        _id: 'achievement-id',
        criteria: {
          type: 'message_count',
          target: 10,
          progressTrackable: true,
        },
        badgeId: 'badge-id',
        title: 'Test Achievement',
      };
      
      mockAchievementModel.find.mockResolvedValue([mockAchievement]);
      
      // Mock user achievement (almost completed)
      const mockUserAchievement = {
        _id: 'user-achievement-id',
        userId: 'user-id',
        achievementId: 'achievement-id',
        progress: 8,
        target: 10,
        percentComplete: 80,
        isCompleted: false,
        save: jest.fn().mockImplementation(function() {
          return {
            ...this,
            _id: 'user-achievement-id',
          };
        }),
      };
      
      mockUserAchievementModel.findOne.mockResolvedValue(mockUserAchievement);
      
      // Mock badge for notification
      mockBadgeModel.findById.mockResolvedValue({
        _id: 'badge-id',
        imageUrl: 'badge-url',
      });
      
      // Execute the tracking
      await service.trackActivity('user-id', 'message_count', 3);
      
      // Assertions
      expect(mockUserAchievement.progress).toBe(11);
      expect(mockUserAchievement.percentComplete).toBe(100);
      expect(mockUserAchievement.isCompleted).toBe(true);
      expect(mockUserAchievement.completedAt).toBeDefined();
      
      // Verify event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'achievement.completed',
        {
          userId: 'user-id',
          achievementId: 'achievement-id',
        }
      );
    });
  });
  
  // Add more test cases for other methods...
});