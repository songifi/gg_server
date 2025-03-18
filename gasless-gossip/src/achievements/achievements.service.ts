// src/modules/achievements/achievements.service.ts
import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AchievementDocument } from './schemas/achievement.schema';
import { BadgeDocument } from './schemas/badge.schema';
import { UserAchievementDocument } from './schemas/user-achievement.schema';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';
import { AchievementCategory } from './enums/achievement-category.enum';
import { AchievementType } from './enums/achievement-type.enum';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectModel('Achievement') private achievementModel: Model<AchievementDocument>,
    @InjectModel('Badge') private badgeModel: Model<BadgeDocument>,
    @InjectModel('UserAchievement') private userAchievementModel: Model<UserAchievementDocument>,
    private readonly eventEmitter: EventEmitter2,
    // Inject NotificationService to send achievement notifications
    // private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new achievement
   */
  async createAchievement(createAchievementDto: CreateAchievementDto): Promise<AchievementResponseDto> {
    // First check if badge exists
    const badge = await this.badgeModel.findById(createAchievementDto.badgeId).exec();
    
    if (!badge) {
      throw new NotFoundException(`Badge with ID ${createAchievementDto.badgeId} not found`);
    }
    
    // Create the achievement
    const achievement = new this.achievementModel(createAchievementDto);
    const savedAchievement = await achievement.save();
    
    // Update badge with achievement ID for bidirectional reference
    badge.achievementId = savedAchievement._id;
    await badge.save();
    
    // Format response with badge details
    const response = new AchievementResponseDto({
      ...savedAchievement.toObject(),
      badge: badge.toObject(),
    });
    
    return response;
  }

  /**
   * Create a new badge
   */
  async createBadge(createBadgeDto: CreateBadgeDto): Promise<BadgeDocument> {
    const badge = new this.badgeModel(createBadgeDto);
    return badge.save();
  }

  /**
   * Get all achievements with filtering options
   */
  async getAchievements(
    category?: AchievementCategory,
    includeSecret = false,
    userId?: string
  ): Promise<AchievementResponseDto[]> {
    // Build query based on filters
    const query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    if (!includeSecret) {
      query.isSecret = false;
    }
    
    // Find achievements
    const achievements = await this.achievementModel.find(query)
      .populate('badgeId')
      .sort({ rarity: 1, category: 1 })
      .exec();
    
    // If userId is provided, get progress for each achievement
    let userAchievements: Record<string, any> = {};
    if (userId) {
      const userAchievementEntries = await this.userAchievementModel.find({
        userId,
        achievementId: { $in: achievements.map(a => a._id) }
      }).exec();
      
      userAchievements = userAchievementEntries.reduce((acc, entry) => {
        acc[entry.achievementId.toString()] = entry;
        return acc;
      }, {});
    }
    
    // Format response
    return achievements.map(achievement => {
      const achievementObj = achievement.toObject();
      const response = new AchievementResponseDto({
        ...achievementObj,
        badge: achievementObj.badgeId,
      });
      
      // Add user progress if available
      if (userId && userAchievements[achievement._id.toString()]) {
        const progress = userAchievements[achievement._id.toString()];
        response.userProgress = {
          progress: progress.progress,
          target: progress.target,
          percentComplete: progress.percentComplete,
          isCompleted: progress.isCompleted,
          completedAt: progress.completedAt,
        };
      }
      
      return response;
    });
  }

  /**
   * Get an achievement by ID
   */
  async getAchievement(
    achievementId: string,
    userId?: string
  ): Promise<AchievementResponseDto> {
    const achievement = await this.achievementModel.findById(achievementId)
      .populate('badgeId')
      .exec();
    
    if (!achievement) {
      throw new NotFoundException(`Achievement with ID ${achievementId} not found`);
    }
    
    // Format response
    const achievementObj = achievement.toObject();
    const response = new AchievementResponseDto({
      ...achievementObj,
      badge: achievementObj.badgeId,
    });
    
    // Add user progress if userId provided
    if (userId) {
      const userAchievement = await this.userAchievementModel.findOne({
        userId,
        achievementId,
      }).exec();
      
      if (userAchievement) {
        response.userProgress = {
          progress: userAchievement.progress,
          target: userAchievement.target,
          percentComplete: userAchievement.percentComplete,
          isCompleted: userAchievement.isCompleted,
          completedAt: userAchievement.completedAt,
        };
      }
    }
    
    return response;
  }

  /**
   * Get all user achievements
   */
  async getUserAchievements(
    userId: string,
    onlyCompleted = false
  ): Promise<UserAchievementResponseDto[]> {
    // Build query
    const query: any = { userId };
    
    if (onlyCompleted) {
      query.isCompleted = true;
    }
    
    // Find user achievements
    const userAchievements = await this.userAchievementModel.find(query)
      .populate({
        path: 'achievementId',
        populate: {
          path: 'badgeId'
        }
      })
      .sort({ completedAt: -1, updatedAt: -1 })
      .exec();
    
    // Format response
    return userAchievements.map(userAchievement => {
      const userAchievementObj = userAchievement.toObject();
      const achievementObj = userAchievementObj.achievementId;
      
      // Hide secret achievements that are not completed
      if (achievementObj.isSecret && !userAchievementObj.isCompleted) {
        achievementObj.title = 'Secret Achievement';
        achievementObj.description = 'Keep playing to unlock this secret achievement';
      }
      
      return new UserAchievementResponseDto({
        ...userAchievementObj,
        achievement: new AchievementResponseDto({
          ...achievementObj,
          badge: achievementObj.badgeId,
        }),
      });
    });
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId: string): Promise<any[]> {
    // Find completed user achievements
    const userAchievements = await this.userAchievementModel.find({
      userId,
      isCompleted: true,
    }).exec();
    
    if (userAchievements.length === 0) {
      return [];
    }
    
    // Get achievement IDs
    const achievementIds = userAchievements.map(ua => ua.achievementId);
    
    // Find associated badges
    const achievements = await this.achievementModel.find({
      _id: { $in: achievementIds },
    }).populate('badgeId').exec();
    
    // Map and return badges
    return achievements.map(achievement => {
      const achievementObj = achievement.toObject();
      const badgeObj = achievementObj.badgeId;
      const userAchievement = userAchievements.find(
        ua => ua.achievementId.toString() === achievement._id.toString()
      );
      
      return {
        id: badgeObj._id,
        name: badgeObj.name,
        description: badgeObj.description,
        imageUrl: badgeObj.imageUrl,
        achievementTitle: achievementObj.title,
        achievementId: achievement._id,
        earnedAt: userAchievement.completedAt,
      };
    });
  }

  /**
   * Track an activity for potential achievement progress
   */
  async trackActivity(
    userId: string,
    activityType: string,
    value = 1,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Find achievements that match this activity type
      const achievements = await this.achievementModel.find({
        'criteria.type': activityType,
      }).exec();
      
      if (achievements.length === 0) {
        return;
      }
      
      // Process each matching achievement
      for (const achievement of achievements) {
        await this.processAchievementProgress(userId, achievement, value, metadata);
      }
    } catch (error) {
      this.logger.error(`Error tracking activity: ${error.message}`, error.stack);
    }
  }

  /**
   * Process achievement progress for a user
   */
  private async processAchievementProgress(
    userId: string,
    achievement: AchievementDocument,
    value: number,
    metadata: Record<string, any>
  ): Promise<void> {
    // Check if achievement conditions match metadata
    if (achievement.criteria.conditions) {
      // Check if all conditions are met
      for (const [key, condition] of Object.entries(achievement.criteria.conditions)) {
        // Skip if metadata doesn't have this key
        if (!(key in metadata)) {
          return;
        }
        
        // Check if condition matches (simple equality for now)
        if (metadata[key] !== condition) {
          return;
        }
      }
    }
    
    // Find or create user achievement
    let userAchievement = await this.userAchievementModel.findOne({
      userId,
      achievementId: achievement._id,
    }).exec();
    
    // If user already completed this achievement, do nothing
    if (userAchievement?.isCompleted) {
      return;
    }
    
    // Create new user achievement if it doesn't exist
    if (!userAchievement) {
      userAchievement = new this.userAchievementModel({
        userId,
        achievementId: achievement._id,
        progress: 0,
        target: achievement.criteria.target,
        percentComplete: 0,
        isCompleted: false,
      });
    }
    
    // Update progress if achievement is incrementally trackable
    if (achievement.criteria.progressTrackable) {
      userAchievement.progress += value;
    } else {
      // For non-trackable achievements, set to target if conditions are met
      userAchievement.progress = achievement.criteria.target;
    }
    
    // Calculate percent complete
    userAchievement.percentComplete = Math.min(
      Math.round((userAchievement.progress / userAchievement.target) * 100),
      100
    );
    
    // Check if achievement is completed
    const wasCompleted = userAchievement.isCompleted;
    userAchievement.isCompleted = userAchievement.progress >= userAchievement.target;
    
    // If newly completed, set completion date
    if (userAchievement.isCompleted && !wasCompleted) {
      userAchievement.completedAt = new Date();
      
      // Emit achievement completed event
      this.eventEmitter.emit('achievement.completed', {
        userId,
        achievementId: achievement._id,
      });
      
      // Send notification
      await this.sendAchievementNotification(userId, achievement);
    }
    
    // Save updated user achievement
    await userAchievement.save();
  }

  /**
   * Send notification for completed achievement
   */
  private async sendAchievementNotification(
    userId: string,
    achievement: AchievementDocument
  ): Promise<void> {
    try {
      // Get badge info
      const badge = await this.badgeModel.findById(achievement.badgeId).exec();
      
      // In a real implementation, you'd use a notification service here
      // this.notificationService.sendNotification({
      //   userId,
      //   type: 'achievement_earned',
      //   title: 'Achievement Unlocked!',
      //   message: `You earned the "${achievement.title}" achievement!`,
      //   data: {
      //     achievementId: achievement._id,
      //     badgeId: badge._id,
      //     badgeUrl: badge.imageUrl,
      //   },
      // });
      
      // For now, we'll just log it
      this.logger.log(`User ${userId} earned achievement: ${achievement.title}`);
    } catch (error) {
      this.logger.error(`Error sending achievement notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Manually update achievement progress (for testing/admin purposes)
   */
  async updateProgress(
    userId: string,
    achievementId: string,
    updateProgressDto: UpdateProgressDto
  ): Promise<UserAchievementResponseDto> {
    // Find achievement
    const achievement = await this.achievementModel.findById(achievementId).exec();
    
    if (!achievement) {
      throw new NotFoundException(`Achievement with ID ${achievementId} not found`);
    }
    
    // Find or create user achievement
    let userAchievement = await this.userAchievementModel.findOne({
      userId,
      achievementId,
    }).exec();
    
    if (!userAchievement) {
      userAchievement = new this.userAchievementModel({
        userId,
        achievementId,
        progress: 0,
        target: achievement.criteria.target,
        percentComplete: 0,
        isCompleted: false,
      });
    }
    
    // Update progress
    userAchievement.progress = updateProgressDto.progress;
    
    // Calculate percent complete
    userAchievement.percentComplete = Math.min(
      Math.round((userAchievement.progress / userAchievement.target) * 100),
      100
    );
    
    // Check if achievement is completed
    const wasCompleted = userAchievement.isCompleted;
    userAchievement.isCompleted = userAchievement.progress >= userAchievement.target;
    
    // If newly completed, set completion date
    if (userAchievement.isCompleted && !wasCompleted) {
      userAchievement.completedAt = new Date();
      
      // Emit achievement completed event
      this.eventEmitter.emit('achievement.completed', {
        userId,
        achievementId,
      });
      
      // Send notification
      await this.sendAchievementNotification(userId, achievement);
    }
    
    // Save updated user achievement
    const savedUserAchievement = await userAchievement.save();
    
    // Format response
    const response = new UserAchievementResponseDto(savedUserAchievement.toObject());
    
    return response;
  }

  /**
   * Reset user achievement progress (for testing/admin purposes)
   */
  async resetProgress(userId: string, achievementId: string): Promise<void> {
    await this.userAchievementModel.findOneAndDelete({
      userId,
      achievementId,
    }).exec();
  }

  /**
   * Get user achievement stats (total earned, points, etc.)
   */
  async getUserAchievementStats(userId: string): Promise<any> {
    // Find all completed user achievements
    const completedAchievements = await this.userAchievementModel.find({
      userId,
      isCompleted: true,
    }).exec();
    
    if (completedAchievements.length === 0) {
      return {
        totalAchievements: 0,
        totalPoints: 0,
        byCategory: {},
        byRarity: {},
      };
    }
    
    // Get achievement details
    const achievementIds = completedAchievements.map(ua => ua.achievementId);
    const achievements = await this.achievementModel.find({
      _id: { $in: achievementIds },
    }).exec();
    
    // Calculate stats
    let totalPoints = 0;
    const byCategory: Record<string, number> = {};
    const byRarity: Record<string, number> = {};
    
    achievements.forEach(achievement => {
      totalPoints += achievement.points;
      
      // Count by category
      byCategory[achievement.category] = (byCategory[achievement.category] || 0) + 1;
      
      // Count by rarity
      byRarity[achievement.rarity] = (byRarity[achievement.rarity] || 0) + 1;
    });
    
    return {
      totalAchievements: achievements.length,
      totalPoints,
      byCategory,
      byRarity,
    };
  }
}
