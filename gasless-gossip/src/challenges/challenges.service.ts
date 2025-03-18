// src/modules/challenges/challenges.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ChallengeDocument } from './schemas/challenge.schema';
import { ChallengeProgressDocument } from './schemas/challenge-progress.schema';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { ChallengeProgressResponseDto } from './dto/challenge-progress-response.dto';
import { LeaderboardResponseDto, LeaderboardEntryDto } from './dto/leaderboard-response.dto';
import { ChallengeStatus } from './enums/challenge-status.enum';
import { ChallengeType } from './enums/challenge-type.enum';
import { ProgressStatus } from './enums/progress-status.enum';
import { LeaderboardEntry } from './interfaces/leaderboard-entry.interface';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    @InjectModel('Challenge') private challengeModel: Model<ChallengeDocument>,
    @InjectModel('ChallengeProgress') private progressModel: Model<ChallengeProgressDocument>,
    // Inject UserService to get user details for leaderboard
    // private readonly userService: UserService, 
    // Inject TokenService for reward distribution
    // private readonly tokenService: TokenService,
  ) {}

  /**
   * Create a new challenge
   */
  async createChallenge(createdBy: string, createChallengeDto: CreateChallengeDto): Promise<ChallengeResponseDto> {
    // Set initial status based on dates and isDraft flag
    const now = new Date();
    let initialStatus = createChallengeDto.isDraft ? ChallengeStatus.DRAFT : ChallengeStatus.ACTIVE;
    
    // If start date is in the future, set to DRAFT regardless
    if (createChallengeDto.startDate > now) {
      initialStatus = ChallengeStatus.DRAFT;
    }
    
    // For time-bound challenges, end date is required
    if (createChallengeDto.type === ChallengeType.TIME_BOUND && !createChallengeDto.endDate) {
      throw new BadRequestException('End date is required for time-bound challenges');
    }
    
    // Create the challenge
    const challenge = new this.challengeModel({
      ...createChallengeDto,
      status: initialStatus,
      createdBy,
      participantCount: 0,
      completionCount: 0,
    });
    
    const savedChallenge = await challenge.save();
    return new ChallengeResponseDto(savedChallenge.toObject());
  }

  /**
   * Get all challenges with filtering options
   */
  async getChallenges(
    status?: ChallengeStatus,
    type?: ChallengeType,
    page = 1,
    limit = 10,
  ): Promise<{ challenges: ChallengeResponseDto[], total: number, page: number, pages: number }> {
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const [challenges, total] = await Promise.all([
      this.challengeModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.challengeModel.countDocuments(query).exec(),
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      challenges: challenges.map(challenge => new ChallengeResponseDto(challenge.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Get a challenge by ID with optional user progress
   */
  async getChallenge(challengeId: string, userId?: string): Promise<ChallengeResponseDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    const challengeResponse = new ChallengeResponseDto(challenge.toObject());
    
    // If userId provided, get user progress
    if (userId) {
      const progress = await this.progressModel.findOne({
        challengeId,
        userId,
      }).exec();
      
      if (progress) {
        challengeResponse.userProgress = {
          status: progress.status,
          currentValue: progress.currentValue,
          targetValue: progress.targetValue,
          percentComplete: progress.percentComplete,
          completedAt: progress.completedAt,
          rewardClaimed: progress.rewardClaimed,
        };
      }
    }
    
    return challengeResponse;
  }

  /**
   * Update a challenge
   */
  async updateChallenge(
    challengeId: string,
    updateChallengeDto: UpdateChallengeDto,
  ): Promise<ChallengeResponseDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    // Cannot update completed or expired challenges
    if (challenge.status === ChallengeStatus.COMPLETED || challenge.status === ChallengeStatus.EXPIRED) {
      throw new BadRequestException(`Cannot update challenges that are ${challenge.status}`);
    }
    
    // Update fields if provided
    if (updateChallengeDto.title !== undefined) challenge.title = updateChallengeDto.title;
    if (updateChallengeDto.description !== undefined) challenge.description = updateChallengeDto.description;
    if (updateChallengeDto.type !== undefined) challenge.type = updateChallengeDto.type;
    if (updateChallengeDto.criteria !== undefined) challenge.criteria = updateChallengeDto.criteria;
    if (updateChallengeDto.rewards !== undefined) challenge.rewards = updateChallengeDto.rewards;
    if (updateChallengeDto.startDate !== undefined) challenge.startDate = updateChallengeDto.startDate;
    if (updateChallengeDto.endDate !== undefined) challenge.endDate = updateChallengeDto.endDate;
    if (updateChallengeDto.maxParticipants !== undefined) challenge.maxParticipants = updateChallengeDto.maxParticipants;
    
    // Handle status change
    if (updateChallengeDto.status !== undefined) {
      challenge.status = updateChallengeDto.status;
    } else if (updateChallengeDto.isActive) {
      challenge.status = ChallengeStatus.ACTIVE;
    }
    
    // For time-bound challenges, ensure end date is set
    if (challenge.type === ChallengeType.TIME_BOUND && !challenge.endDate) {
      throw new BadRequestException('End date is required for time-bound challenges');
    }
    
    const updatedChallenge = await challenge.save();
    return new ChallengeResponseDto(updatedChallenge.toObject());
  }

  /**
   * Delete a challenge
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    // Only draft challenges can be deleted
    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException('Only draft challenges can be deleted');
    }
    
    // Delete all progress for this challenge
    await this.progressModel.deleteMany({ challengeId }).exec();
    
    // Delete the challenge
    await this.challengeModel.findByIdAndDelete(challengeId).exec();
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId: string, challengeId: string): Promise<ChallengeProgressResponseDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    // Check if challenge is active
    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException(`Cannot join challenge with status ${challenge.status}`);
    }
    
    // Check if challenge has reached max participants
    if (challenge.maxParticipants && challenge.participantCount >= challenge.maxParticipants) {
      throw new BadRequestException('Challenge has reached maximum number of participants');
    }
    
    // Check if user already joined
    const existingProgress = await this.progressModel.findOne({
      userId,
      challengeId,
    }).exec();
    
    if (existingProgress) {
      return new ChallengeProgressResponseDto(existingProgress.toObject());
    }
    
    // Create new progress record
    const progress = new this.progressModel({
      userId,
      challengeId,
      status: ProgressStatus.IN_PROGRESS,
      currentValue: 0,
      targetValue: challenge.criteria.target,
      percentComplete: 0,
    });
    
    const savedProgress = await progress.save();
    
    // Increment participant count
    await this.challengeModel.findByIdAndUpdate(
      challengeId,
      { $inc: { participantCount: 1 } }
    ).exec();
    
    return new ChallengeProgressResponseDto(savedProgress.toObject());
  }

  /**
   * Update user progress for a challenge
   */
  async updateProgress(
    userId: string,
    challengeId: string,
    updateProgressDto: UpdateProgressDto,
  ): Promise<ChallengeProgressResponseDto> {
    const [challenge, progress] = await Promise.all([
      this.challengeModel.findById(challengeId).exec(),
      this.progressModel.findOne({
        userId,
        challengeId,
      }).exec(),
    ]);
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    if (!progress) {
      throw new NotFoundException('You have not joined this challenge');
    }
    
    // Check if challenge is active
    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException(`Cannot update progress for challenge with status ${challenge.status}`);
    }
    
    // Check if progress is already completed
    if (progress.status === ProgressStatus.COMPLETED || progress.status === ProgressStatus.REWARD_CLAIMED) {
      throw new BadRequestException('Challenge already completed');
    }
    
    // Update progress
    progress.currentValue = updateProgressDto.currentValue;
    
    // Calculate percent complete
    progress.percentComplete = Math.min(
      Math.round((progress.currentValue / progress.targetValue) * 100),
      100
    );
    
    // Check if challenge is completed
    if (progress.currentValue >= progress.targetValue) {
      progress.status = ProgressStatus.COMPLETED;
      progress.completedAt = new Date();
      
      // Increment completion count
      await this.challengeModel.findByIdAndUpdate(
        challengeId,
        { $inc: { completionCount: 1 } }
      ).exec();
    }
    
    const updatedProgress = await progress.save();
    return new ChallengeProgressResponseDto(updatedProgress.toObject());
  }

  /**
   * Claim reward for a completed challenge
   */
  async claimReward(userId: string, challengeId: string): Promise<ChallengeProgressResponseDto> {
    const [challenge, progress] = await Promise.all([
      this.challengeModel.findById(challengeId).exec(),
      this.progressModel.findOne({
        userId,
        challengeId,
      }).exec(),
    ]);
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    if (!progress) {
      throw new NotFoundException('You have not joined this challenge');
    }
    
    // Check if challenge is completed
    if (progress.status !== ProgressStatus.COMPLETED) {
      throw new BadRequestException('Challenge not completed');
    }
    
    // Check if reward already claimed
    if (progress.rewardClaimed) {
      throw new BadRequestException('Reward already claimed');
    }
    
    // Process rewards
    for (const reward of challenge.rewards) {
      await this.processReward(userId, reward);
    }
    
    // Update progress
    progress.rewardClaimed = true;
    progress.rewardClaimedAt = new Date();
    progress.status = ProgressStatus.REWARD_CLAIMED;
    
    const updatedProgress = await progress.save();
    return new ChallengeProgressResponseDto(updatedProgress.toObject());
  }

  /**
   * Process reward distribution
   * This is a placeholder for actual reward distribution logic
   */
  private async processReward(userId: string, reward: any): Promise<void> {
    // Implementation depends on specific reward types
    switch (reward.type) {
      case 'token':
        // Call token service to transfer tokens
        // await this.tokenService.transferTokens(userId, reward.tokenAddress, reward.amount);
        break;
      case 'badge':
        // Assign badge to user
        // await this.badgeService.assignBadge(userId, reward.badgeId);
        break;
      case 'role':
        // Assign role to user
        // await this.roleService.assignRole(userId, reward.roleId);
        break;
      case 'custom':
        // Process custom reward
        break;
    }
  }

  /**
   * Get user progress for a challenge
   */
  async getUserProgress(
    userId: string,
    challengeId: string,
  ): Promise<ChallengeProgressResponseDto> {
    const progress = await this.progressModel.findOne({
      userId,
      challengeId,
    }).exec();
    
    if (!progress) {
      throw new NotFoundException('You have not joined this challenge');
    }
    
    return new ChallengeProgressResponseDto(progress.toObject());
  }

  /**
   * Get all user progresses
   */
  async getUserProgresses(
    userId: string,
    status?: ProgressStatus,
    page = 1,
    limit = 10,
  ): Promise<{ progresses: ChallengeProgressResponseDto[], total: number, page: number, pages: number }> {
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const [progresses, total] = await Promise.all([
      this.progressModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.progressModel.countDocuments(query).exec(),
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      progresses: progresses.map(progress => new ChallengeProgressResponseDto(progress.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Get challenge leaderboard
   */
  async getLeaderboard(
    challengeId: string,
    limit = 10,
  ): Promise<LeaderboardResponseDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${challengeId} not found`);
    }
    
    // Get progress entries sorted by current value (descending) and completion time
    const progressEntries = await this.progressModel.find({ challengeId })
      .sort({ currentValue: -1, completedAt: 1 })
      .limit(limit)
      .exec();
    
    // If there are no participants, return empty leaderboard
    if (progressEntries.length === 0) {
      return {
        challengeId,
        challengeTitle: challenge.title,
        totalParticipants: 0,
        entries: [],
      };
    }
    
    // Get user details for each entry
    // In a real implementation, we would fetch user details from UserService
    // This is a simplified implementation
    const leaderboardEntries: LeaderboardEntryDto[] = await Promise.all(
      progressEntries.map(async (progress, index) => {
        // In real implementation, replace with:
        // const user = await this.userService.getUserById(progress.userId);
        const user = {
          id: progress.userId,
          username: `user_${progress.userId.substring(0, 5)}`,
          displayName: `User ${progress.userId.substring(0, 5)}`,
          avatarUrl: null,
        };
        
        return new LeaderboardEntryDto({
          userId: progress.userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          currentValue: progress.currentValue,
          percentComplete: progress.percentComplete,
          completedAt: progress.completedAt,
          rank: index + 1,
        });
      })
    );
    
    return {
      challengeId,
      challengeTitle: challenge.title,
      totalParticipants: challenge.participantCount,
      entries: leaderboardEntries,
    };
  }

  /**
   * Cron job to check for challenges that should be activated or expired
   * Runs every hour
   */
  @Cron('0 * * * *')
  async handleChallengeStatusUpdates() {
    const now = new Date();
    
    try {
      // Activate challenges whose start date has passed
      await this.challengeModel.updateMany(
        {
          status: ChallengeStatus.DRAFT,
          startDate: { $lte: now },
        },
        {
          status: ChallengeStatus.ACTIVE,
        }
      ).exec();
      
      // Expire time-bound challenges whose end date has passed
      await this.challengeModel.updateMany(
        {
          status: ChallengeStatus.ACTIVE,
          type: ChallengeType.TIME_BOUND,
          endDate: { $lte: now },
        },
        {
          status: ChallengeStatus.EXPIRED,
        }
      ).exec();
      
      this.logger.log('Updated challenge statuses');
    } catch (error) {
      this.logger.error(`Error updating challenge statuses: ${error.message}`, error.stack);
    }
  }
}
