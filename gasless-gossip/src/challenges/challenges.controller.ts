// src/modules/challenges/challenges.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';
  import { Roles } from '../auths/decorators/roles.decorator';
  import { JwtAuthGuard } from '../auths/guards/jwt-auth.guard';
  import { RolesGuard } from '../auths/guards/roles.guard';
  import { ChallengesService } from './challenges.service';
  import { CreateChallengeDto } from './dto/create-challenge.dto';
  import { UpdateChallengeDto } from './dto/update-challenge.dto';
  import { UpdateProgressDto } from './dto/update-progress.dto';
  import { ChallengeResponseDto } from './dto/challenge-response.dto';
  import { ChallengeProgressResponseDto } from './dto/challenge-progress-response.dto';
  import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
  import { ChallengeStatus } from './enums/challenge-status.enum';
  import { ChallengeType } from './enums/challenge-type.enum';
  import { ProgressStatus } from './enums/progress-status.enum';
  
  @ApiTags('challenges')
  @Controller('challenges')
  export class ChallengesController {
    constructor(private readonly challengesService: ChallengesService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new challenge' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Challenge created successfully', type: ChallengeResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async createChallenge(
      @Request() req,
      @Body() createChallengeDto: CreateChallengeDto,
    ): Promise<ChallengeResponseDto> {
      return this.challengesService.createChallenge(req.user.userId, createChallengeDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all challenges' })
    @ApiQuery({ name: 'status', required: false, enum: ChallengeStatus })
    @ApiQuery({ name: 'type', required: false, enum: ChallengeType })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Challenges retrieved successfully' })
    async getChallenges(
      @Query('status') status?: ChallengeStatus,
      @Query('type') type?: ChallengeType,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ): Promise<{ challenges: ChallengeResponseDto[], total: number, page: number, pages: number }> {
      return this.challengesService.getChallenges(
        status,
        type,
        page ? parseInt(String(page), 10) : 1,
        limit ? parseInt(String(limit), 10) : 10,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a challenge by ID' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Challenge retrieved successfully', type: ChallengeResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    async getChallenge(
      @Param('id') id: string,
      @Request() req,
    ): Promise<ChallengeResponseDto> {
      // If user is authenticated, include their progress
      const userId = req.user?.userId;
      return this.challengesService.getChallenge(id, userId);
    }
  
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a challenge' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Challenge updated successfully', type: ChallengeResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async updateChallenge(
      @Param('id') id: string,
      @Body() updateChallengeDto: UpdateChallengeDto,
    ): Promise<ChallengeResponseDto> {
      return this.challengesService.updateChallenge(id, updateChallengeDto);
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a challenge' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Challenge deleted successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete active challenge' })
    async deleteChallenge(@Param('id') id: string): Promise<void> {
      return this.challengesService.deleteChallenge(id);
    }
  
    @Post(':id/join')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Join a challenge' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Joined challenge successfully', type: ChallengeProgressResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot join challenge' })
    async joinChallenge(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ChallengeProgressResponseDto> {
      return this.challengesService.joinChallenge(req.user.userId, id);
    }
  
    @Patch(':id/progress')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update challenge progress' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully', type: ChallengeProgressResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid progress update' })
    async updateProgress(
      @Request() req,
      @Param('id') id: string,
      @Body() updateProgressDto: UpdateProgressDto,
    ): Promise<ChallengeProgressResponseDto> {
      return this.challengesService.updateProgress(req.user.userId, id, updateProgressDto);
    }
  
    @Post(':id/claim-reward')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Claim reward for completed challenge' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Reward claimed successfully', type: ChallengeProgressResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot claim reward' })
    async claimReward(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ChallengeProgressResponseDto> {
      return this.challengesService.claimReward(req.user.userId, id);
    }
  
    @Get(':id/progress')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user progress for a challenge' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Progress retrieved successfully', type: ChallengeProgressResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Progress not found' })
    async getUserProgress(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ChallengeProgressResponseDto> {
      return this.challengesService.getUserProgress(req.user.userId, id);
    }
  
    @Get('user/progresses')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all user progresses' })
    @ApiQuery({ name: 'status', required: false, enum: ProgressStatus })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Progresses retrieved successfully' })
    async getUserProgresses(
      @Request() req,
      @Query('status') status?: ProgressStatus,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ): Promise<{ progresses: ChallengeProgressResponseDto[], total: number, page: number, pages: number }> {
      return this.challengesService.getUserProgresses(
        req.user.userId,
        status,
        page ? parseInt(String(page), 10) : 1,
        limit ? parseInt(String(limit), 10) : 10,
      );
    }
  
    @Get(':id/leaderboard')
    @ApiOperation({ summary: 'Get challenge leaderboard' })
    @ApiParam({ name: 'id', description: 'Challenge ID' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of entries (default: 10)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboard retrieved successfully', type: LeaderboardResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Challenge not found' })
    async getLeaderboard(
      @Param('id') id: string,
      @Query('limit') limit?: number,
    ): Promise<LeaderboardResponseDto> {
      return this.challengesService.getLeaderboard(
        id,
        limit ? parseInt(String(limit), 10) : 10,
      );
    }
  }
  