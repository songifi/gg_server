import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    Request,
    HttpStatus,
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
  import { ReputationService } from './reputation.service';
  import { ReputationResponseDto } from './dto/reputation-response.dto';
  import { ReputationHistoryResponseDto } from './dto/reputation-history-response.dto';
  import { UpdateReputationSettingsDto } from './dto/update-reputation-settings.dto';
  import { ReputationFactor } from './enums/reputation-factor.enum';
  import { ReputationLevel } from './enums/reputation-level.enum';
  
  @ApiTags('reputation')
  @Controller('reputation')
  export class ReputationController {
    constructor(private readonly reputationService: ReputationService) {}
  
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user reputation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved successfully', type: ReputationResponseDto })
    async getMyReputation(@Request() req): Promise<ReputationResponseDto> {
      return this.reputationService.getUserReputation(req.user.userId);
    }
  
    @Get('users/:userId')
    @ApiOperation({ summary: 'Get reputation for a specific user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved successfully', type: ReputationResponseDto })
    async getUserReputation(@Param('userId') userId: string): Promise<ReputationResponseDto> {
      return this.reputationService.getUserReputation(userId);
    }
  
    @Get('history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get reputation history for current user' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'factor', required: false, enum: ReputationFactor, description: 'Filter by factor' })
    @ApiResponse({ status: HttpStatus.OK, description: 'History retrieved successfully' })
    async getMyReputationHistory(
      @Request() req,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
      @Query('factor') factor?: ReputationFactor,
    ): Promise<{ history: ReputationHistoryResponseDto[], total: number, page: number, pages: number }> {
      return this.reputationService.getReputationHistory(
        req.user.userId,
        page ? +page : 1,
        limit ? +limit : 20,
        factor
      );
    }
  
    @Get('history/:userId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get reputation history for a specific user (admin only)' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'factor', required: false, enum: ReputationFactor, description: 'Filter by factor' })
    @ApiResponse({ status: HttpStatus.OK, description: 'History retrieved successfully' })
    async getUserReputationHistory(
      @Param('userId') userId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
      @Query('factor') factor?: ReputationFactor,
    ): Promise<{ history: ReputationHistoryResponseDto[], total: number, page: number, pages: number }> {
      return this.reputationService.getReputationHistory(
        userId,
        page ? +page : 1,
        limit ? +limit : 20,
        factor
      );
    }
  
    @Get('leaderboard')
    @ApiOperation({ summary: 'Get reputation leaderboard' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of results' })
    @ApiQuery({ name: 'level', required: false, enum: ReputationLevel, description: 'Filter by level' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboard retrieved successfully' })
    async getLeaderboard(
      @Query('limit') limit?: number,
      @Query('level') level?: ReputationLevel,
    ): Promise<{ rank: number; userId: string; score: number; level: ReputationLevel }[]> {
      return this.reputationService.getLeaderboard(
        limit ? +limit : 20,
        level
      );
    }
  
    @Get('distribution')
    @ApiOperation({ summary: 'Get reputation level distribution' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Distribution retrieved successfully' })
    async getLevelDistribution(): Promise<Record<ReputationLevel, number>> {
      return this.reputationService.getLevelDistribution();
    }
  
    @Get('settings')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get reputation system settings (admin only)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Settings retrieved successfully' })
    async getSettings(): Promise<any> {
      return this.reputationService.getReputationSettings();
    }
  
    @Patch('settings')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update reputation system settings (admin only)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated successfully' })
    async updateSettings(
      @Body() updateSettingsDto: UpdateReputationSettingsDto
    ): Promise<any> {
      return this.reputationService.updateReputationSettings(updateSettingsDto);
    }
  }
  