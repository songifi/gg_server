import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { TransactionStatsDocument } from './schemas/transaction-stats.schema';
import { DailyStatsDocument } from './schemas/daily-stats.schema';
import { LeaderboardCacheDocument } from './schemas/leaderboard-cache.schema';
import { LeaderboardCategory } from './enums/leaderboard-category.enum';
import { TimePeriod } from './enums/time-period.enum';
import { LeaderboardResponseDto, LeaderboardEntryDto } from './dto/leaderboard-response.dto';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly CACHE_TTL = {
    [TimePeriod.DAILY]: 1000 * 60 * 15,         // 15 minutes
    [TimePeriod.WEEKLY]: 1000 * 60 * 60,        // 1 hour
    [TimePeriod.MONTHLY]: 1000 * 60 * 60 * 3,   // 3 hours
    [TimePeriod.YEARLY]: 1000 * 60 * 60 * 6,    // 6 hours
    [TimePeriod.ALL_TIME]: 1000 * 60 * 60 * 12, // 12 hours
  };

  constructor(
    @InjectModel('TransactionStats')
    private transactionStatsModel: Model<TransactionStatsDocument>,
    @InjectModel('DailyStats')
    private dailyStatsModel: Model<DailyStatsDocument>,
    @InjectModel('LeaderboardCache')
    private leaderboardCacheModel: Model<LeaderboardCacheDocument>,
    private readonly eventEmitter: EventEmitter2,
    // Inject UserService to get user details
    // private readonly userService: UserService,
  ) {}

  /**
   * Track a new token transaction for leaderboard
   */
  @OnEvent('token.transaction')
  async trackTransaction(payload: {
    senderId: string;
    recipientId: string;
    tokenAddress: string;
    value: number;
    tokenCount: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      const { senderId, recipientId, value, tokenCount, timestamp } = payload;
      const transactionDate = new Date(timestamp);
      const dateString = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const date = new Date(dateString);

      // Update sender's all-time stats
      await this.updateUserStats(senderId, recipientId, value, tokenCount, transactionDate);

      // Update sender's daily stats
      await this.updateDailyStats(senderId, date, value, tokenCount, recipientId);

      // Invalidate affected caches
      await this.invalidateCache();

      this.logger.log(`Tracked transaction: ${senderId} sent ${value} to ${recipientId}`);
    } catch (error) {
      this.logger.error(`Error tracking transaction: ${error.message}`, error.stack);
    }
  }

  /**
   * Update user's transaction stats
   */
  private async updateUserStats(
    userId: string,
    recipientId: string,
    value: number,
    tokenCount: number,
    transactionDate: Date,
  ): Promise<void> {
    // Find or create user stats
    let stats = await this.transactionStatsModel.findOne({ userId }).exec();

    if (!stats) {
      stats = new this.transactionStatsModel({
        userId,
        totalValue: 0,
        transactionCount: 0,
        averageValue: 0,
        recipientCount: 0,
        tokenCount: 0,
        streak: 0,
        longestStreak: 0,
        firstTransactionDate: transactionDate,
      });
    }

    // Update transaction counts and values
    stats.totalValue += value;
    stats.transactionCount += 1;
    stats.tokenCount += tokenCount;
    stats.averageValue = stats.totalValue / stats.transactionCount;

    // Update first transaction date if this is earlier
    if (!stats.firstTransactionDate || transactionDate < stats.firstTransactionDate) {
      stats.firstTransactionDate = transactionDate;
    }

    // Check if recipient is new (for unique recipient count)
    const previousRecipients = await this.dailyStatsModel.distinct('recipientId', {
      userId,
      recipientId,
    }).exec();

    if (previousRecipients.length === 0) {
      stats.recipientCount += 1;
    }

    // Update streak information
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const transactionDay = new Date(transactionDate);
    transactionDay.setHours(0, 0, 0, 0);

    // Check if the transaction is from today
    if (transactionDay.getTime() === today.getTime()) {
      // If last transaction was yesterday, increment streak
      if (stats.lastTransactionDate) {
        const lastTransactionDay = new Date(stats.lastTransactionDate);
        lastTransactionDay.setHours(0, 0, 0, 0);
        
        if (lastTransactionDay.getTime() === yesterday.getTime()) {
          stats.streak += 1;
        } else if (lastTransactionDay.getTime() !== today.getTime()) {
          // Reset streak if last transaction was not yesterday and not today
          stats.streak = 1;
        }
      } else {
        // First transaction
        stats.streak = 1;
      }

      // Update longest streak if current streak is longer
      if (stats.streak > stats.longestStreak) {
        stats.longestStreak = stats.streak;
      }
    }

    // Update last transaction date
    stats.lastTransactionDate = transactionDate;
    
    // Save updated stats
    await stats.save();
  }

  /**
   * Update user's daily stats
   */
  private async updateDailyStats(
    userId: string,
    date: Date,
    value: number,
    tokenCount: number,
    recipientId: string,
  ): Promise<void> {
    // Find or create daily stats
    let dailyStats = await this.dailyStatsModel.findOne({ userId, date }).exec();

    if (!dailyStats) {
      dailyStats = new this.dailyStatsModel({
        userId,
        date,
        totalValue: 0,
        transactionCount: 0,
        recipientCount: 0,
        tokenCount: 0,
      });
    }

    // Update stats
    dailyStats.totalValue += value;
    dailyStats.transactionCount += 1;
    dailyStats.tokenCount += tokenCount;

    // Check if recipient is new for this day
    const dailyRecipients = await this.dailyStatsModel.distinct('recipientId', {
      userId,
      date,
      recipientId,
    }).exec();

    if (dailyRecipients.length === 0) {
      dailyStats.recipientCount += 1;
    }

    // Save updated daily stats
    await dailyStats.save();
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    category: LeaderboardCategory,
    period: TimePeriod,
    limit = 10,
  ): Promise<LeaderboardResponseDto> {
    // Check for cached result
    const cachedLeaderboard = await this.getCachedLeaderboard(category, period, limit);
    if (cachedLeaderboard) {
      return cachedLeaderboard;
    }

    // Generate leaderboard
    const startDate = this.getStartDateForPeriod(period);
    const entries = await this.generateLeaderboard(category, startDate, limit);

    // Cache the result
    await this.cacheLeaderboard(category, period, entries);

    return new LeaderboardResponseDto({
      category,
      period,
      lastUpdated: new Date(),
      entries,
    });
  }

  /**
   * Get cached leaderboard if available
   */
  private async getCachedLeaderboard(
    category: LeaderboardCategory,
    period: TimePeriod,
    limit: number,
  ): Promise<LeaderboardResponseDto | null> {
    try {
      const cachedLeaderboard = await this.leaderboardCacheModel.findOne({
        category,
        period,
        expiresAt: { $gt: new Date() },
      }).exec();

      if (cachedLeaderboard) {
        // Return cached result (limited to requested size)
        return new LeaderboardResponseDto({
          category,
          period,
          lastUpdated: cachedLeaderboard.createdAt,
          entries: cachedLeaderboard.entries.slice(0, limit).map(
            entry => new LeaderboardEntryDto(entry)
          ),
        });
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached leaderboard: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Cache leaderboard results
   */
  private async cacheLeaderboard(
    category: LeaderboardCategory,
    period: TimePeriod,
    entries: LeaderboardEntryDto[],
  ): Promise<void> {
    try {
      const now = new Date();
      const ttl = this.CACHE_TTL[period] || this.CACHE_TTL[TimePeriod.DAILY];
      const expiresAt = new Date(now.getTime() + ttl);

      // Delete existing cache for this category/period
      await this.leaderboardCacheModel.deleteOne({ category, period }).exec();

      // Create new cache entry
      const cacheEntry = new this.leaderboardCacheModel({
        category,
        period,
        createdAt: now,
        expiresAt,
        entries,
      });

      await cacheEntry.save();
    } catch (error) {
      this.logger.error(`Error caching leaderboard: ${error.message}`, error.stack);
    }
  }

  /**
   * Invalidate cache when data changes
   */
  private async invalidateCache(): Promise<void> {
    try {
      // Invalidate daily cache immediately
      await this.leaderboardCacheModel.deleteMany({ period: TimePeriod.DAILY }).exec();
      
      // Mark other caches for rebuilding (we'll delete them gradually)
      this.eventEmitter.emit('leaderboard.cache.invalidated');
    } catch (error) {
      this.logger.error(`Error invalidating cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Generate leaderboard based on category and time period
   */
  private async generateLeaderboard(
    category: LeaderboardCategory,
    startDate: Date | null,
    limit: number,
  ): Promise<LeaderboardEntryDto[]> {
    let pipeline = [];
    
    // Match stage for time period (if applicable)
    if (startDate) {
      pipeline.push({
        $match: {
          date: { $gte: startDate },
        },
      });
    }
    
    // Group by user and calculate metrics
    pipeline.push({
      $group: {
        _id: '$userId',
        totalValue: { $sum: '$totalValue' },
        transactionCount: { $sum: '$transactionCount' },
        recipientCount: { $sum: '$recipientCount' },
        tokenCount: { $sum: '$tokenCount' },
      },
    });
    
    // Add derived metrics
    pipeline.push({
      $addFields: {
        averageValue: {
          $cond: [
            { $eq: ['$transactionCount', 0] },
            0,
            { $divide: ['$totalValue', '$transactionCount'] },
          ],
        },
      },
    });
    
    // Sort based on category
    const sortField = this.getSortFieldForCategory(category);
    pipeline.push({
      $sort: { [sortField]: -1, _id: 1 }, // Sort by metric descending, then by userId for stability
    });
    
    // Limit results
    pipeline.push({ $limit: limit });
    
    // Select fields for output
    pipeline.push({
      $project: {
        _id: 0,
        userId: '$_id',
        value: `$${sortField}`,
      },
    });
    
    // Execute pipeline
    let results;
    
    if (startDate) {
      // Use daily stats for time-bounded queries
      results = await this.dailyStatsModel.aggregate(pipeline).exec();
    } else {
      // Use all-time stats for all-time queries
      const allTimeQuery = category === LeaderboardCategory.STREAK
        ? { $sort: { longestStreak: -1 }, $limit: limit }
        : pipeline[1]; // Use the group stage as-is
        
      results = await this.transactionStatsModel.aggregate([
        allTimeQuery,
        {
          $project: {
            _id: 0,
            userId: 1,
            value: `$${sortField}`,
          },
        },
        { $limit: limit },
      ]).exec();
    }
    
    // Enrich with user details
    return await this.enrichLeaderboardEntries(results);
  }

  /**
   * Get the appropriate sort field for a category
   */
  private getSortFieldForCategory(category: LeaderboardCategory): string {
    const mapping = {
      [LeaderboardCategory.MOST_VALUE_SENT]: 'totalValue',
      [LeaderboardCategory.MOST_TRANSACTIONS]: 'transactionCount',
      [LeaderboardCategory.HIGHEST_AVERAGE_VALUE]: 'averageValue',
      [LeaderboardCategory.MOST_RECIPIENTS]: 'recipientCount',
      [LeaderboardCategory.MOST_TOKENS]: 'tokenCount',
      [LeaderboardCategory.STREAK]: 'longestStreak',
    };

    return mapping[category] || 'totalValue';
  }

  /**
   * Enrich leaderboard entries with user details
   */
  private async enrichLeaderboardEntries(
    entries: Array<{ userId: string; value: number }>,
  ): Promise<LeaderboardEntryDto[]> {
    if (entries.length === 0) {
      return [];
    }

    // In a real implementation, we would fetch user details from UserService
    // const userIds = entries.map(entry => entry.userId);
    // const users = await this.userService.getUsersByIds(userIds);
    
    // For this example, we'll simulate user data
    const userDetailsMap = entries.reduce((acc, entry, index) => {
      acc[entry.userId] = {
        username: `user_${entry.userId.substring(0, 5)}`,
        displayName: `User ${index + 1}`,
        avatarUrl: null,
      };
      return acc;
    }, {});

    // Map entries with user details and assign ranks
    return entries.map((entry, index) => {
      const userDetails = userDetailsMap[entry.userId] || {
        username: 'unknown',
        displayName: 'Unknown User',
      };

      return new LeaderboardEntryDto({
        userId: entry.userId,
        username: userDetails.username,
        displayName: userDetails.displayName,
        avatarUrl: userDetails.avatarUrl,
        value: entry.value,
        rank: index + 1,
      });
    });
  }

  /**
   * Get start date for a time period
   */
  private getStartDateForPeriod(period: TimePeriod): Date | null {
    if (period === TimePeriod.ALL_TIME) {
      return null;
    }

    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case TimePeriod.DAILY:
        startDate.setHours(0, 0, 0, 0);
        break;
      case TimePeriod.WEEKLY:
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case TimePeriod.MONTHLY:
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case TimePeriod.YEARLY:
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return startDate;
  }

  /**
   * Get user's transaction stats
   */
  async getUserStats(userId: string): Promise<UserStatsResponseDto> {
    const stats = await this.transactionStatsModel.findOne({ userId }).exec();

    if (!stats) {
      throw new NotFoundException(`No stats found for user ${userId}`);
    }

    // Get user rankings in different categories and periods
    const rankings = await this.getUserRankings(userId);

    // In a real implementation, we would fetch user details from UserService
    // const user = await this.userService.getUserById(userId);
    const user = {
      username: `user_${userId.substring(0, 5)}`,
      displayName: `User ${userId.substring(0, 5)}`,
    };

    return new UserStatsResponseDto({
      userId,
      username: user.username,
      displayName: user.displayName,
      totalValue: stats.totalValue,
      transactionCount: stats.transactionCount,
      averageValue: stats.averageValue,
      recipientCount: stats.recipientCount,
      tokenCount: stats.tokenCount,
      streak: stats.streak,
      longestStreak: stats.longestStreak,
      rankings,
    });
  }

  /**
   * Get user's rankings in different categories and periods
   */
  private async getUserRankings(userId: string): Promise<Array<{
    category: string;
    period: string;
    rank: number;
    value: number;
  }>> {
    const rankings = [];
    const categories = Object.values(LeaderboardCategory);
    const periods = Object.values(TimePeriod);

    // Get rankings for each category and period
    for (const category of categories) {
      for (const period of periods) {
        const leaderboard = await this.getLeaderboard(category, period, 100);
        const entry = leaderboard.entries.find(e => e.userId === userId);

        if (entry) {
          rankings.push({
            category,
            period,
            rank: entry.rank,
            value: entry.value,
          });
        }
      }
    }

    return rankings;
  }

  /**
   * Scheduled job to clean up old cache entries
   */
  @Cron('0 */30 * * * *') // Run every 30 minutes
  async cleanExpiredCache() {
    try {
      const result = await this.leaderboardCacheModel.deleteMany({
        expiresAt: { $lt: new Date() },
      }).exec();

      if (result.deletedCount > 0) {
        this.logger.log(`Cleaned ${result.deletedCount} expired cache entries`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning expired cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Reset stats for testing
   */
  async resetStats(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Stats can only be reset in test environment');
    }

    await Promise.all([
      this.transactionStatsModel.deleteMany({}).exec(),
      this.dailyStatsModel.deleteMany({}).exec(),
      this.leaderboardCacheModel.deleteMany({}).exec(),
    ]);
  }
}
