import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    CacheInterceptor,
    CacheTTL,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';
  import { LeaderboardService } from './leaderboard.service';
  import { LeaderboardCategory } from './enums/leaderboard-category.enum';
  import { TimePeriod } from './enums/time-period.enum';
  import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
  import { UserStatsResponseDto } from './dto/user-stats-response.dto';
  
  @ApiTags('leaderboard')
  @Controller('leaderboard')
  export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) {}
  
    @Get()
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(30) // 30 seconds HTTP cache
    @ApiOperation({ summary: 'Get leaderboard data' })
    @ApiQuery({
      name: 'category',
      enum: LeaderboardCategory,
      required: false,
      description: 'Leaderboard category',
    })
    @ApiQuery({
      name: 'period',
      enum: TimePeriod,
      required: false,
      description: 'Time period',
    })
    @ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of entries to return',
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Leaderboard data retrieved successfully',
      type: LeaderboardResponseDto,
    })
    async getLeaderboard(
      @Query('category') category: LeaderboardCategory = LeaderboardCategory.MOST_VALUE_SENT,
      @Query('period') period: TimePeriod = TimePeriod.ALL_TIME,
      @Query('limit') limit: number = 10,
    ): Promise<LeaderboardResponseDto> {
      return this.leaderboardService.getLeaderboard(
        category,
        period,
        Math.min(Math.max(1, limit), 100), // Limit between 1 and 100
      );
    }
  
    @Get('users/:userId')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60) // 60 seconds HTTP cache
    @ApiOperation({ summary: 'Get user transaction stats' })
    @ApiParam({
      name: 'userId',
      description: 'User ID',
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User stats retrieved successfully',
      type: UserStatsResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User stats not found',
    })
    async getUserStats(@Param('userId') userId: string): Promise<UserStatsResponseDto> {
      return this.leaderboardService.getUserStats(userId);
    }
  
    @Get('categories')
    @ApiOperation({ summary: 'Get available leaderboard categories' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Categories retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    })
    getCategories() {
      return {
        categories: [
          {
            id: LeaderboardCategory.MOST_VALUE_SENT,
            name: 'Most Value Sent',
            description: 'Users who have sent the highest total value of tokens',
          },
          {
            id: LeaderboardCategory.MOST_TRANSACTIONS,
            name: 'Most Transactions',
            description: 'Users who have completed the most transactions',
          },
          {
            id: LeaderboardCategory.HIGHEST_AVERAGE_VALUE,
            name: 'Highest Average Value',
            description: 'Users with the highest average value per transaction',
          },
          {
            id: LeaderboardCategory.MOST_RECIPIENTS,
            name: 'Most Recipients',
            description: 'Users who have sent tokens to the most unique recipients',
          },
          {
            id: LeaderboardCategory.MOST_TOKENS,
            name: 'Most Tokens',
            description: 'Users who have sent the highest number of tokens (count)',
          },
          {
            id: LeaderboardCategory.STREAK,
            name: 'Longest Streak',
            description: 'Users with the longest streak of daily transactions',
          },
        ],
      };
    }
  
    @Get('periods')
    @ApiOperation({ summary: 'Get available time periods' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Time periods retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          periods: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    })
    getPeriods() {
      return {
        periods: [
          {
            id: TimePeriod.DAILY,
            name: 'Today',
            description: 'Rankings for the current day',
          },
          {
            id: TimePeriod.WEEKLY,
            name: 'This Week',
            description: 'Rankings for the current week (starting Monday)',
          },
          {
            id: TimePeriod.MONTHLY,
            name: 'This Month',
            description: 'Rankings for the current month',
          },
          {
            id: TimePeriod.YEARLY,
            name: 'This Year',
            description: 'Rankings for the current year',
          },
          {
            id: TimePeriod.ALL_TIME,
            name: 'All Time',
            description: 'Rankings since the beginning of time',
          },
        ],
      };
    }
  }
  
  