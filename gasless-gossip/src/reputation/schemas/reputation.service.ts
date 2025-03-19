import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ReputationDocument } from './schemas/reputation.schema';
import { ReputationHistoryDocument } from './schemas/reputation-history.schema';
import { ReputationSettingsDocument } from './schemas/reputation-settings.schema';
import { ReputationResponseDto } from './dto/reputation-response.dto';
import { ReputationHistoryResponseDto } from './dto/reputation-history-response.dto';
import { UpdateReputationSettingsDto } from './dto/update-reputation-settings.dto';
import { ReputationLevel } from './enums/reputation-level.enum';
import { ReputationFactor } from './enums/reputation-factor.enum';
import { ReputationChangeType } from './enums/reputation-change-type.enum';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);
  private settings: ReputationSettingsDocument;

  constructor(
    @InjectModel('Reputation') private reputationModel: Model<ReputationDocument>,
    @InjectModel('ReputationHistory') private historyModel: Model<ReputationHistoryDocument>,
    @InjectModel('ReputationSettings') private settingsModel: Model<ReputationSettingsDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.loadSettings();
  }

  /**
   * Load reputation settings from the database
   */
  private async loadSettings(): Promise<void> {
    try {
      // Get settings or create default settings if not found
      let settings = await this.settingsModel.findOne({}).exec();
      
      if (!settings) {
        settings = new this.settingsModel({});
        await settings.save();
      }
      
      this.settings = settings;
    } catch (error) {
      this.logger.error(`Error loading reputation settings: ${error.message}`, error.stack);
      // Create default settings in memory if database access fails
      this.settings = {
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
        isActive: true
      } as ReputationSettingsDocument;
    }
  }

  /**
   * Calculate reputation level based on score
   */
  private calculateLevel(score: number): ReputationLevel {
    const thresholds = this.settings.levelThresholds;
    
    if (score >= thresholds.elite) return ReputationLevel.ELITE;
    if (score >= thresholds.veteran) return ReputationLevel.VETERAN;
    if (score >= thresholds.trusted) return ReputationLevel.TRUSTED;
    if (score >= thresholds.established) return ReputationLevel.ESTABLISHED;
    if (score >= thresholds.regular) return ReputationLevel.REGULAR;
    return ReputationLevel.NEWCOMER;
  }

  /**
   * Update user reputation for a specific factor
   */
  async updateReputation(
    userId: string,
    factor: ReputationFactor,
    points: number,
    reason: string,
    metadata: Record<string, any> = {}
  ): Promise<ReputationDocument> {
    if (!this.settings.isActive) {
      return null;
    }
    
    // Ensure points are within reasonable limits
    points = Math.min(Math.abs(points), 100);
    
    // Determine if this is an increase or decrease
    const changeType = points >= 0 
      ? ReputationChangeType.INCREASE 
      : ReputationChangeType.DECREASE;
    
    // Get current reputation or create a new one
    let reputation = await this.reputationModel.findOne({ userId }).exec();
    
    if (!reputation) {
      reputation = new this.reputationModel({
        userId,
        score: 0,
        level: ReputationLevel.NEWCOMER,
        metrics: {
          messageActivity: 0,
          tokenTransfers: 0,
          challengeCompletion: 0,
          peerRatings: 0,
          accountAge: 0,
          contentQuality: 0,
          achievementPoints: 0
        }
      });
    }
    
    // Store old values for history
    const oldScore = reputation.score;
    const oldLevel = reputation.level;
    
    // Update the specific metric
    const metricKey = this.getMetricKey(factor);
    if (metricKey) {
      reputation.metrics[metricKey] += points;
      // Ensure metric doesn't go below 0
      reputation.metrics[metricKey] = Math.max(0, reputation.metrics[metricKey]);
    }
    
    // Recalculate total score based on weighted metrics
    reputation.score = this.calculateScore(reputation.metrics);
    
    // Ensure score is within bounds
    reputation.score = Math.max(this.settings.minScore, Math.min(reputation.score, this.settings.maxScore));
    
    // Calculate new level
    reputation.level = this.calculateLevel(reputation.score);
    
    // Update timestamp
    reputation.lastUpdated = new Date();
    
    // Save updated reputation
    const updatedReputation = await reputation.save();
    
    // Create history entry
    await this.createHistoryEntry({
      userId,
      factor,
      changeType,
      points: Math.abs(points),
      reason,
      oldScore,
      newScore: updatedReputation.score,
      oldLevel,
      newLevel: updatedReputation.level,
      metadata
    });
    
    // If level changed, emit event
    if (oldLevel !== updatedReputation.level) {
      this.eventEmitter.emit('reputation.levelChanged', {
        userId,
        oldLevel,
        newLevel: updatedReputation.level,
        score: updatedReputation.score
      });
    }
    
    return updatedReputation;
  }

  /**
   * Create a reputation history entry
   */
  private async createHistoryEntry(data: {
    userId: string;
    factor: ReputationFactor;
    changeType: ReputationChangeType;
    points: number;
    reason: string;
    oldScore: number;
    newScore: number;
    oldLevel?: ReputationLevel;
    newLevel?: ReputationLevel;
    metadata?: Record<string, any>;
  }): Promise<ReputationHistoryDocument> {
    const historyEntry = new this.historyModel(data);
    return historyEntry.save();
  }

  /**
   * Calculate weighted reputation score
   */
  private calculateScore(metrics: any): number {
    const weights = this.settings.factorWeights;
    
    return (
      metrics.messageActivity * weights.messageActivity +
      metrics.tokenTransfers * weights.tokenTransfers +
      metrics.challengeCompletion * weights.challengeCompletion +
      metrics.peerRatings * weights.peerRatings +
      metrics.accountAge * weights.accountAge +
      metrics.contentQuality * weights.contentQuality +
      metrics.achievementPoints * weights.achievementPoints
    ) / 100; // Normalize based on total weight
  }

  /**
   * Get metric key from factor
   */
  private getMetricKey(factor: ReputationFactor): string {
    const mapping = {
      [ReputationFactor.MESSAGE_ACTIVITY]: 'messageActivity',
      [ReputationFactor.TOKEN_TRANSFERS]: 'tokenTransfers',
      [ReputationFactor.CHALLENGE_COMPLETION]: 'challengeCompletion',
      [ReputationFactor.PEER_RATINGS]: 'peerRatings',
      [ReputationFactor.ACCOUNT_AGE]: 'accountAge',
      [ReputationFactor.CONTENT_QUALITY]: 'contentQuality',
      [ReputationFactor.ACHIEVEMENT_EARNED]: 'achievementPoints'
    };
    
    return mapping[factor];
  }

  /**
   * Get user reputation
   */
  async getUserReputation(userId: string): Promise<ReputationResponseDto> {
    const reputation = await this.reputationModel.findOne({ userId }).exec();
    
    if (!reputation) {
      // Return default reputation if not found
      return new ReputationResponseDto({
        userId,
        score: 0,
        level: ReputationLevel.NEWCOMER,
        metrics: {
          messageActivity: 0,
          tokenTransfers: 0,
          challengeCompletion: 0,
          peerRatings: 0,
          accountAge: 0,
          contentQuality: 0,
          achievementPoints: 0
        },
        lastUpdated: new Date(),
        nextLevel: {
          name: ReputationLevel.REGULAR,
          threshold: this.settings.levelThresholds.regular,
          pointsNeeded: this.settings.levelThresholds.regular
        }
      });
    }
    
    // Calculate next level info
    const nextLevel = this.getNextLevel(reputation.level, reputation.score);
    
    return new ReputationResponseDto({
      ...reputation.toObject(),
      nextLevel
    });
  }

  /**
   * Get next level information
   */
  private getNextLevel(currentLevel: ReputationLevel, currentScore: number): { name: ReputationLevel; threshold: number; pointsNeeded: number } | undefined {
    const thresholds = this.settings.levelThresholds;
    
    switch (currentLevel) {
      case ReputationLevel.NEWCOMER:
        return {
          name: ReputationLevel.REGULAR,
          threshold: thresholds.regular,
          pointsNeeded: thresholds.regular - currentScore
        };
      case ReputationLevel.REGULAR:
        return {
          name: ReputationLevel.ESTABLISHED,
          threshold: thresholds.established,
          pointsNeeded: thresholds.established - currentScore
        };
      case ReputationLevel.ESTABLISHED:
        return {
          name: ReputationLevel.TRUSTED,
          threshold: thresholds.trusted,
          pointsNeeded: thresholds.trusted - currentScore
        };
      case ReputationLevel.TRUSTED:
        return {
          name: ReputationLevel.VETERAN,
          threshold: thresholds.veteran,
          pointsNeeded: thresholds.veteran - currentScore
        };
      case ReputationLevel.VETERAN:
        return {
          name: ReputationLevel.ELITE,
          threshold: thresholds.elite,
          pointsNeeded: thresholds.elite - currentScore
        };
      case ReputationLevel.ELITE:
        return undefined; // No next level
    }
  }

  /**
   * Get reputation history for a user
   */
  async getReputationHistory(
    userId: string,
    page = 1,
    limit = 20,
    factor?: ReputationFactor,
  ): Promise<{ history: ReputationHistoryResponseDto[], total: number, page: number, pages: number }> {
    const query: any = { userId };
    
    if (factor) {
      query.factor = factor;
    }
    
    const skip = (page - 1) * limit;
    
    const [history, total] = await Promise.all([
      this.historyModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.historyModel.countDocuments(query).exec(),
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      history: history.map(entry => new ReputationHistoryResponseDto(entry.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Get reputation settings
   */
  async getReputationSettings(): Promise<ReputationSettingsDocument> {
    return this.settings;
  }

  /**
   * Update reputation settings
   */
  async updateReputationSettings(
    updateSettingsDto: UpdateReputationSettingsDto
  ): Promise<ReputationSettingsDocument> {
    // Update only provided fields
    if (updateSettingsDto.factorWeights) {
      this.settings.factorWeights = {
        ...this.settings.factorWeights,
        ...updateSettingsDto.factorWeights
      };
    }
    
    if (updateSettingsDto.levelThresholds) {
      this.settings.levelThresholds = {
        ...this.settings.levelThresholds,
        ...updateSettingsDto.levelThresholds
      };
    }
    
    if (updateSettingsDto.decayEnabled !== undefined) {
      this.settings.decayEnabled = updateSettingsDto.decayEnabled;
    }
    
    if (updateSettingsDto.decayRate !== undefined) {
      this.settings.decayRate = updateSettingsDto.decayRate;
    }
    
    if (updateSettingsDto.maxScore !== undefined) {
      this.settings.maxScore = updateSettingsDto.maxScore;
    }
    
    if (updateSettingsDto.minScore !== undefined) {
      this.settings.minScore = updateSettingsDto.minScore;
    }
    
    if (updateSettingsDto.isActive !== undefined) {
      this.settings.isActive = updateSettingsDto.isActive;
    }
    
    // Save updated settings
    const updatedSettings = await this.settings.save();
    this.settings = updatedSettings;
    
    return updatedSettings;
  }

  /**
   * Get leaderboard of top users by reputation
   */
  async getLeaderboard(
    limit = 20,
    level?: ReputationLevel
  ): Promise<{ rank: number; userId: string; score: number; level: ReputationLevel }[]> {
    const query: any = {};
    
    if (level) {
      query.level = level;
    }
    
    const users = await this.reputationModel.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .exec();
    
    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      score: user.score,
      level: user.level
    }));
  }

  /**
   * Get reputation level distribution
   */
  async getLevelDistribution(): Promise<Record<ReputationLevel, number>> {
    const distribution = await this.reputationModel.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]).exec();
    
    // Initialize with zeros
    const result = Object.values(ReputationLevel).reduce((acc, level) => {
      acc[level] = 0;
      return acc;
    }, {} as Record<ReputationLevel, number>);
    
    // Fill in actual counts
    distribution.forEach(item => {
      result[item._id] = item.count;
    });
    
    return result;
  }

  /**
   * Daily cron job for reputation maintenance
   * - Apply decay for inactive users
   * - Update account age reputation
   */
  @Cron('0 0 * * *') // Run at midnight every day
  async dailyReputationMaintenance() {
    if (!this.settings.isActive) return;
    
    try {
      // Apply decay if enabled
      if (this.settings.decayEnabled) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 14); // 2 weeks inactivity
        
        const inactiveUsers = await this.reputationModel.find({
          lastUpdated: { $lt: cutoffDate },
          score: { $gt: 0 }
        }).exec();
        
        for (const user of inactiveUsers) {
          await this.updateReputation(
            user.userId,
            ReputationFactor.ACCOUNT_AGE,
            -this.settings.decayRate,
            'Reputation decay due to inactivity',
            { inactiveDays: Math.floor((Date.now() - user.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)) }
          );
        }
      }
      
      // Increase account age reputation for active users (monthly)
      const now = new Date();
      if (now.getDate() === 1) { // First day of month
        // Get active users
        const users = await this.reputationModel.find({}).exec();
        
        for (const user of users) {
          await this.updateReputation(
            user.userId,
            ReputationFactor.ACCOUNT_AGE,
            5, // 5 points per month
            'Monthly account age reputation increase',
            { month: now.getMonth(), year: now.getFullYear() }
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in daily reputation maintenance: ${error.message}`, error.stack);
    }
  }

  /**
   * Event listeners for reputation triggers
   */
  
  @OnEvent('message.sent')
  async handleMessageSent(payload: { userId: string, messageId: string }) {
    await this.updateReputation(
      payload.userId,
      ReputationFactor.MESSAGE_ACTIVITY,
      1,
      'Sent a message',
      { messageId: payload.messageId }
    );
  }
  
  @OnEvent('token.transferred')
  async handleTokenTransferred(payload: { 
    userId: string, 
    amount: string, 
    tokenAddress: string,
    transactionHash: string
  }) {
    await this.updateReputation(
      payload.userId,
      ReputationFactor.TOKEN_TRANSFERS,
      2,
      'Successful token transfer',
      { 
        amount: payload.amount,
        tokenAddress: payload.tokenAddress,
        transactionHash: payload.transactionHash
      }
    );
  }
  
  @OnEvent('challenge.completed')
  async handleChallengeCompleted(payload: { userId: string, challengeId: string }) {
    await this.updateReputation(
      payload.userId,
      ReputationFactor.CHALLENGE_COMPLETION,
      10,
      'Completed a challenge',
      { challengeId: payload.challengeId }
    );
  }
  
  @OnEvent('user.rated')
  async handleUserRated(payload: { 
    targetUserId: string, 
    ratingUserId: string,
    rating: number, // 1-5
    context: string
  }) {
    // Convert 1-5 rating to reputation points (1=0, 2=2, 3=5, 4=8, 5=10)
    const pointsMap = { 1: 0, 2: 2, 3: 5, 4: 8, 5: 10 };
    const points = pointsMap[payload.rating] || 0;
    
    await this.updateReputation(
      payload.targetUserId,
      ReputationFactor.PEER_RATINGS,
      points,
      'Received user rating',
      { 
        fromUserId: payload.ratingUserId,
        rating: payload.rating,
        context: payload.context
      }
    );
  }
  
  @OnEvent('achievement.earned')
  async handleAchievementEarned(payload: { 
    userId: string, 
    achievementId: string,
    points: number
  }) {
    await this.updateReputation(
      payload.userId,
      ReputationFactor.ACHIEVEMENT_EARNED,
      payload.points,
      'Earned an achievement',
      { achievementId: payload.achievementId }
    );
  }
  
  @OnEvent('content.rated')
  async handleContentRated(payload: { 
    authorId: string, 
    contentId: string,
    contentType: string,
    rating: number, // 1-5
    ratingCount: number
  }) {
    // Only update reputation if there are multiple ratings (reduce manipulation)
    if (payload.ratingCount >= 3) {
      // Map 1-5 rating to reputation points
      const points = (payload.rating - 3) * 2; // -4 to +4 points
      
      await this.updateReputation(
        payload.authorId,
        ReputationFactor.CONTENT_QUALITY,
        points,
        'Content quality rating',
        { 
          contentId: payload.contentId,
          contentType: payload.contentType,
          rating: payload.rating,
          ratingCount: payload.ratingCount
        }
      );
    }
  }
}