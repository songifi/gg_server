// File: src/modules/users/controllers/user.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiQuery,
  } from '@nestjs/swagger';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { UserService } from '../services/user.service';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  import { CreateUserDto } from '../dtos/create-user.dto';
  import { UpdateProfileDto } from '../dtos/update-profile.dto';
  import { ChangePasswordDto } from '../dtos/change-password.dto';
  import { UserProfileResponseDto } from '../dtos/response.dto';
  import { User } from '../entities/user.entity';
  
  @ApiTags('users')
  @Controller('users')
  export class UserController {
    constructor(private readonly userService: UserService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User created successfully',
      type: UserProfileResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Username or email already exists',
    })
    async createUser(@Body() createUserDto: CreateUserDto): Promise<UserProfileResponseDto> {
      const user = await this.userService.create(createUserDto);
      return this.mapUserToResponseDto(user);
    }
  
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User profile retrieved successfully',
      type: UserProfileResponseDto,
    })
    async getCurrentUser(@CurrentUser() userId: string): Promise<UserProfileResponseDto> {
      const user = await this.userService.findById(userId);
      await this.userService.updateLastActive(userId);
      return this.mapUserToResponseDto(user);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User retrieved successfully',
      type: UserProfileResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
    })
    async getUserById(@Param('id') id: string): Promise<UserProfileResponseDto> {
      const user = await this.userService.findById(id);
      return this.mapUserToResponseDto(user);
    }
  
    @Get('username/:username')
    @ApiOperation({ summary: 'Get user by username' })
    @ApiParam({ name: 'username', description: 'Username' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User retrieved successfully',
      type: UserProfileResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
    })
    async getUserByUsername(@Param('username') username: string): Promise<UserProfileResponseDto> {
      const user = await this.userService.findByUsername(username);
      return this.mapUserToResponseDto(user);
    }
  
    @Put('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Profile updated successfully',
      type: UserProfileResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Username already exists',
    })
    async updateProfile(
      @CurrentUser() userId: string,
      @Body() updateProfileDto: UpdateProfileDto,
    ): Promise<UserProfileResponseDto> {
      const user = await this.userService.updateProfile(userId, updateProfileDto);
      return this.mapUserToResponseDto(user);
    }
  
    @Post('avatar')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('avatar'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload avatar image' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          avatar: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Avatar uploaded successfully',
      type: UserProfileResponseDto,
    })
    async uploadAvatar(
      @CurrentUser() userId: string,
      @UploadedFile() file: Express.Multer.File,
    ): Promise<UserProfileResponseDto> {
      if (!file) {
        throw new BadRequestException('Avatar file is required');
      }
  
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Only JPG, PNG, GIF, and WebP images are allowed');
      }
  
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('Avatar image must be smaller than 5MB');
      }
  
      const user = await this.userService.uploadAvatar(userId, file);
      return this.mapUserToResponseDto(user);
    }
  
    @Post('cover-image')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('coverImage'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload cover image' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          coverImage: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Cover image uploaded successfully',
      type: UserProfileResponseDto,
    })
    async uploadCoverImage(
      @CurrentUser() userId: string,
      @UploadedFile() file: Express.Multer.File,
    ): Promise<UserProfileResponseDto> {
      if (!file) {
        throw new BadRequestException('Cover image file is required');
      }
  
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Only JPG, PNG, and WebP images are allowed');
      }
  
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('Cover image must be smaller than 10MB');
      }
  
      const user = await this.userService.uploadCoverImage(userId, file);
      return this.mapUserToResponseDto(user);
    }
  
    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Password changed successfully',
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Current password is incorrect',
    })
    async changePassword(
      @CurrentUser() userId: string,
      @Body() changePasswordDto: ChangePasswordDto,
    ): Promise<{ success: boolean }> {
      await this.userService.changePassword(userId, changePasswordDto);
      return { success: true };
    }
  
    @Delete('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete current user account' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User deleted successfully',
    })
    async deleteAccount(@CurrentUser() userId: string): Promise<{ success: boolean }> {
      const deleted = await this.userService.deleteUser(userId);
      return { success: deleted };
    }
  
    @Get('check-username')
    @ApiOperation({ summary: 'Check if username is available' })
    @ApiQuery({ name: 'username', description: 'Username to check' })
    @ApiQuery({ 
      name: 'excludeUserId', 
      description: 'Optional user ID to exclude from check (for updates)', 
      required: false 
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Username availability check result',
      schema: {
        type: 'object',
        properties: {
          available: {
            type: 'boolean',
            example: true,
          },
        },
      },
    })
    async checkUsername(
      @Query('username') username: string,
      @Query('excludeUserId') excludeUserId?: string,
    ): Promise<{ available: boolean }> {
      if (!username) {
        throw new BadRequestException('Username is required');
      }
  
      const available = await this.userService.isUsernameAvailable(username, excludeUserId);
      return { available };
    }
  
    /**
     * Map User entity to UserProfileResponseDto
     */
    private mapUserToResponseDto(user: User): UserProfileResponseDto {
      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
        location: user.location,
        website: user.website,
        birthday: user.birthday,
        gender: user.gender,
        theme: user.theme,
        interests: user.interests,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        lastActive: user.lastActive,
        socialLinks: user.socialLinks,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
  }