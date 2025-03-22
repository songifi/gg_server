// File: src/modules/users/services/user.service.ts
import { 
    Injectable, 
    NotFoundException, 
    BadRequestException, 
    ConflictException, 
    InternalServerErrorException,
    Logger
  } from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model, Types } from 'mongoose';
  import { User } from '../entities/user.entity';
  import { CreateUserDto } from '../dtos/create-user.dto';
  import { UpdateProfileDto } from '../dtos/update-profile.dto';
  import { ChangePasswordDto } from '../dtos/change-password.dto';
  import { StorageService } from '../../storage/services/storage.service';
  import { ConfigService } from '@nestjs/config';
  
  @Injectable()
  export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly avatarBucketName: string;
  
    constructor(
      @InjectModel(User.name) private userModel: Model<User>,
      private readonly storageService: StorageService,
      private readonly configService: ConfigService,
    ) {
      this.avatarBucketName = this.configService.get<string>('AVATAR_BUCKET_NAME', 'user-avatars');
    }
  
    /**
     * Create a new user
     */
    async create(createUserDto: CreateUserDto): Promise<User> {
      try {
        // Check for email uniqueness
        const existingEmail = await this.userModel.findOne({ email: createUserDto.email }).exec();
        if (existingEmail) {
          throw new ConflictException('Email already exists');
        }
  
        // Check for username uniqueness
        const existingUsername = await this.userModel.findOne({ username: createUserDto.username }).exec();
        if (existingUsername) {
          throw new ConflictException('Username already exists');
        }
  
        // Check wallet address uniqueness if provided
        if (createUserDto.walletAddress) {
          const existingWallet = await this.userModel.findOne({ walletAddress: createUserDto.walletAddress }).exec();
          if (existingWallet) {
            throw new ConflictException('Wallet address already associated with another account');
          }
        }
  
        // Create new user
        const newUser = new this.userModel(createUserDto);
        
        // Set default avatar based on name if not provided
        if (!newUser.avatarUrl) {
          newUser.avatarUrl = this.generateDefaultAvatarUrl(newUser.name);
        }
  
        return newUser.save();
      } catch (error) {
        // Rethrow if it's already a NestJS exception
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
  
        // Handle MongoDB duplicate key errors
        if (error.code === 11000) {
          if (error.keyPattern.email) {
            throw new ConflictException('Email already exists');
          }
          if (error.keyPattern.username) {
            throw new ConflictException('Username already exists');
          }
          if (error.keyPattern.walletAddress) {
            throw new ConflictException('Wallet address already associated with another account');
          }
        }
  
        this.logger.error(`Failed to create user: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to create user');
      }
    }
  
    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User> {
      try {
        const user = await this.userModel.findById(id).exec();
  
        if (!user) {
          throw new NotFoundException('User not found');
        }
  
        return user;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        if (error.name === 'CastError') {
          throw new BadRequestException('Invalid user ID');
        }
  
        this.logger.error(`Failed to find user by ID: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to find user');
      }
    }
  
    /**
     * Find user by username
     */
    async findByUsername(username: string): Promise<User> {
      try {
        const user = await this.userModel.findOne({ username }).exec();
  
        if (!user) {
          throw new NotFoundException('User not found');
        }
  
        return user;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Failed to find user by username: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to find user');
      }
    }
  
    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User> {
      try {
        const user = await this.userModel.findOne({ email }).exec();
  
        if (!user) {
          throw new NotFoundException('User not found');
        }
  
        return user;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Failed to find user by email: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to find user');
      }
    }
  
    /**
     * Find user by wallet address
     */
    async findByWalletAddress(walletAddress: string): Promise<User> {
      try {
        const user = await this.userModel.findOne({ walletAddress }).exec();
  
        if (!user) {
          throw new NotFoundException('User not found');
        }
  
        return user;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Failed to find user by wallet address: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to find user');
      }
    }
  
    /**
     * Find users by IDs
     */
    async findByIds(ids: string[]): Promise<User[]> {
      try {
        const objectIds = ids.map(id => new Types.ObjectId(id));
        return this.userModel.find({ _id: { $in: objectIds } }).exec();
      } catch (error) {
        this.logger.error(`Failed to find users by IDs: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to find users');
      }
    }
  
    /**
     * Update user profile
     */
    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
      try {
        // Check if user exists
        const user = await this.findById(userId);
  
        // Check username uniqueness if changing
        if (updateProfileDto.username && updateProfileDto.username !== user.username) {
          const existingUsername = await this.userModel.findOne({ 
            username: updateProfileDto.username,
            _id: { $ne: userId }
          }).exec();
          
          if (existingUsername) {
            throw new ConflictException('Username already exists');
          }
        }
  
        // Check wallet address uniqueness if changing
        if (updateProfileDto.walletAddress && updateProfileDto.walletAddress !== user.walletAddress) {
          const existingWallet = await this.userModel.findOne({ 
            walletAddress: updateProfileDto.walletAddress,
            _id: { $ne: userId }
          }).exec();
          
          if (existingWallet) {
            throw new ConflictException('Wallet address already associated with another account');
          }
        }
  
        // Convert birthday string to Date if provided
        if (updateProfileDto.birthday) {
          updateProfileDto['birthday'] = new Date(updateProfileDto.birthday);
        }
  
        // Update user
        const updatedUser = await this.userModel.findByIdAndUpdate(
          userId,
          { $set: updateProfileDto },
          { new: true }
        ).exec();
  
        if (!updatedUser) {
          throw new NotFoundException('User not found');
        }
  
        return updatedUser;
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof ConflictException) {
          throw error;
        }
  
        if (error.code === 11000) {
          if (error.keyPattern.username) {
            throw new ConflictException('Username already exists');
          }
          if (error.keyPattern.walletAddress) {
            throw new ConflictException('Wallet address already associated with another account');
          }
        }
  
        this.logger.error(`Failed to update user profile: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to update user profile');
      }
    }
  
    /**
     * Change user password
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<boolean> {
      try {
        // Get user with password field
        const user = await this.userModel.findById(userId).select('+password').exec();
  
        if (!user) {
          throw new NotFoundException('User not found');
        }
  
        // Verify current password
        const isPasswordValid = await user.comparePassword(changePasswordDto.currentPassword);
        if (!isPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
  
        // Update password
        user.password = changePasswordDto.newPassword;
        await user.save();
  
        return true;
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
  
        this.logger.error(`Failed to change password: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to change password');
      }
    }
  
    /**
     * Upload avatar image
     */
    async uploadAvatar(userId: string, file: Express.Multer.File): Promise<User> {
      try {
        // Check if user exists
        const user = await this.findById(userId);
  
        // Upload file to storage
        const filename = `${userId}-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        const avatarUrl = await this.storageService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
          this.avatarBucketName
        );
  
        // Delete old avatar if it exists
        if (user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) {
          try {
            await this.storageService.deleteFile(user.avatarUrl);
          } catch (error) {
            // Log but don't fail if old file deletion fails
            this.logger.warn(`Failed to delete old avatar: ${error.message}`);
          }
        }
  
        // Update user with new avatar URL
        const updatedUser = await this.userModel.findByIdAndUpdate(
          userId,
          { $set: { avatarUrl } },
          { new: true }
        ).exec();
  
        return updatedUser;
      } catch (error) {
        this.logger.error(`Failed to upload avatar: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to upload avatar');
      }
    }
  
    /**
     * Upload cover image
     */
    async uploadCoverImage(userId: string, file: Express.Multer.File): Promise<User> {
      try {
        // Check if user exists
        const user = await this.findById(userId);
  
        // Upload file to storage
        const filename = `cover-${userId}-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        const coverImageUrl = await this.storageService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
          this.avatarBucketName
        );
  
        // Delete old cover image if it exists
        if (user.coverImageUrl) {
          try {
            await this.storageService.deleteFile(user.coverImageUrl);
          } catch (error) {
            // Log but don't fail if old file deletion fails
            this.logger.warn(`Failed to delete old cover image: ${error.message}`);
          }
        }
  
        // Update user with new cover image URL
        const updatedUser = await this.userModel.findByIdAndUpdate(
          userId,
          { $set: { coverImageUrl } },
          { new: true }
        ).exec();
  
        return updatedUser;
      } catch (error) {
        this.logger.error(`Failed to upload cover image: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to upload cover image');
      }
    }
  
    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<boolean> {
      try {
        const user = await this.findById(userId);
  
        // Delete user's avatar and cover image
        if (user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) {
          try {
            await this.storageService.deleteFile(user.avatarUrl);
          } catch (error) {
            this.logger.warn(`Failed to delete avatar: ${error.message}`);
          }
        }
  
        if (user.coverImageUrl) {
          try {
            await this.storageService.deleteFile(user.coverImageUrl);
          } catch (error) {
            this.logger.warn(`Failed to delete cover image: ${error.message}`);
          }
        }
  
        // Delete user from database
        const result = await this.userModel.deleteOne({ _id: userId }).exec();
        return result.deletedCount > 0;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to delete user');
      }
    }
  
    /**
     * Update last active timestamp
     */
    async updateLastActive(userId: string): Promise<void> {
      try {
        await this.userModel.findByIdAndUpdate(
          userId,
          { $set: { lastActive: new Date() } }
        ).exec();
      } catch (error) {
        this.logger.warn(`Failed to update last active: ${error.message}`);
        // Don't throw, this is non-critical
      }
    }
  
    /**
     * Check if username is available
     */
    async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
      try {
        const query = { username };
        if (excludeUserId) {
          query['_id'] = { $ne: excludeUserId };
        }
  
        const existingUser = await this.userModel.findOne(query).exec();
        return !existingUser;
      } catch (error) {
        this.logger.error(`Failed to check username availability: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to check username availability');
      }
    }
  
    /**
     * Generate a default avatar URL based on user's name
     */
    private generateDefaultAvatarUrl(name: string): string {
      const initials = name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256&bold=true&length=${initials.length}`;
    }
  }