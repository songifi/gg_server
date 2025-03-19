// src/modules/achievements/achievements.controller.ts
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
  import { Roles } from '../auth/decorators/roles.decorator';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { AchievementsService } from './achievements.service';
  import { CreateAchievementDto } from './dto/create-achievement.dto';
  import { CreateBadgeDto } from './dto/create-badge.dto';
  import { UpdateProgressDto } from './dto/update-progress.dto';
  import { AchievementResponseDto } from './dto/achievement-response.dto';
  import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';
  import { AchievementCategory } from './enums/achievement-category.enum';
  
  @ApiTags('achievements')
  @Controller('achievements')
  export class AchievementsController {
    constructor(private readonly achievementsService: AchievementsService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new achievement' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Achievement created successfully', type: AchievementResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async createAchievement(
      @Body() createAchievementDto: CreateAchievementDto,
    ): Promise<AchievementResponseDto> {
      return this.achievementsService.createAchievement(createAchievementDto);
    }
  
    @Post('badges')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new badge' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Badge created successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async createBadge(@Body() createBadgeDto: CreateBadgeDto): Promise<any> {
      return this.achievementsService.createBadge(createBadgeDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all achievements' })
    @ApiQuery({ name: 'category', required: false, enum: AchievementCategory })
    @ApiQuery({ name: 'includeSecret', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK, description: 'Achievements retrieved successfully', type: [AchievementResponseDto] })
    async getAchievements(
      @Query('category') category?: AchievementCategory,
      @Query('includeSecret') includeSecret?: boolean,
      @Request() req?,
    ): Promise<AchievementResponseDto[]> {
      // Get user ID if authenticated
      const userId = req.user?.userId;
      const showSecret = req.user?.role === 'admin' ? !!includeSecret : false;
      
      return this.achievementsService.getAchievements(category, showSecret, userId);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get an achievement by ID' })
    @ApiParam({ name: 'id', description: 'Achievement ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Achievement retrieved successfully', type: AchievementResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Achievement not found' })
    async getAchievement(
      @Param('id') id: string,
      @Request() req?,
    ): Promise<AchievementResponseDto> {
      // Get user ID if authenticated
      const userId = req.user?.userId;
      
      return this.achievementsService.getAchievement(id, userId);
    }
  
    @Get('user/achievements')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user achievements' })
    @ApiQuery({ name: 'onlyCompleted', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK, description: 'User achievements retrieved successfully', type: [UserAchievementResponseDto] })
    async getUserAchievements(
      @Request() req,
      @Query('onlyCompleted') onlyCompleted?: boolean,
    ): Promise<UserAchievementResponseDto[]> {
      return this.achievementsService.getUserAchievements(
        req.user.userId,
        onlyCompleted === true || onlyCompleted === 'true',
      );
    }
  
    @Get('user/badges')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user badges' })
    @ApiResponse({ status: HttpStatus.OK, description: 'User badges retrieved successfully' })
    async getUserBadges(@Request() req): Promise<any[]> {
      return this.achievementsService.getUserBadges(req.user.userId);
    }
  
    @Get('user/stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user achievement stats' })
    @ApiResponse({ status: HttpStatus.OK, description: 'User achievement stats retrieved successfully' })
    async getUserAchievementStats(@Request() req): Promise<any> {
      return this.achievementsService.getUserAchievementStats(req.user.userId);
    }
  
    @Patch(':id/progress')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Manually update achievement progress (admin only)' })
    @ApiParam({ name: 'id', description: 'Achievement ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully', type: UserAchievementResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Achievement not found' })
    async updateProgress(
      @Param('id') id: string,
      @Body() updateProgressDto: UpdateProgressDto,
      @Query('userId') userId: string,
    ): Promise<UserAchievementResponseDto> {
      return this.achievementsService.updateProgress(userId, id, updateProgressDto);
    }
  
    @Delete(':id/progress')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Reset achievement progress (admin only)' })
    @ApiParam({ name: 'id', description: 'Achievement ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Progress reset successfully' })
    async resetProgress(
      @Param('id') id: string,
      @Query('userId') userId: string,
    ): Promise<void> {
      return this.achievementsService.resetProgress(userId, id);
    }
  
    // Activity tracking endpoint (primarily for testing)
    @Post('track')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Track an activity for achievement progress' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Activity tracked successfully' })
    async trackActivity(
      @Request() req,
      @Body() trackActivityDto: { type: string; value?: number; metadata?: Record<string, any> },
    ): Promise<{ success: boolean }> {
      await this.achievementsService.trackActivity(
        req.user.userId,
        trackActivityDto.type,
        trackActivityDto.value || 1,
        trackActivityDto.metadata || {},
      );
      
      return { success: true };
    }
  }
  