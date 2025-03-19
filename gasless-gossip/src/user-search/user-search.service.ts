import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../user/schemas/user.schema';
import { ContactDocument } from '../contacts/schemas/contact.schema';
import { SearchUserDto, SearchField, SortOrder } from './dto/search-user.dto';
import { UserSearchResultDto, UserSearchResponseDto } from './dto/user-search-response.dto';
import { UserStatus } from '../user/enums/user-status.enum';

@Injectable()
export class UserSearchService {
  private readonly logger = new Logger(UserSearchService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('Contact') private readonly contactModel: Model<ContactDocument>,
  ) {}

  /**
   * Search for users based on various criteria
   */
  async searchUsers(searchDto: SearchUserDto): Promise<UserSearchResponseDto> {
    const { query, fields, limit, page, sortBy, sortOrder, excludeUserId, currentUserId } = searchDto;
    const skip = (page - 1) * limit;

    // Build search pipeline
    const pipeline: any[] = [];

    // Initial match stage with active users only
    pipeline.push({
      $match: {
        status: UserStatus.ACTIVE,
        ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
      }
    });

    // Add text search if query is provided
    if (query && query.trim()) {
      const conditions: any[] = [];
      
      // Check if searching on specific fields or all
      const searchFields = fields.includes(SearchField.ALL) 
        ? [SearchField.USERNAME, SearchField.DISPLAY_NAME, SearchField.WALLET_ADDRESS] 
        : fields;

      // Build query conditions based on fields
      if (searchFields.includes(SearchField.USERNAME)) {
        conditions.push({ username: { $regex: query, $options: 'i' } });
      }
      
      if (searchFields.includes(SearchField.DISPLAY_NAME)) {
        conditions.push({ displayName: { $regex: query, $options: 'i' } });
      }
      
      if (searchFields.includes(SearchField.WALLET_ADDRESS)) {
        conditions.push({ walletAddresses: query });
      }

      if (conditions.length > 0) {
        pipeline.push({ $match: { $or: conditions } });
      }
    }

    // Add scoring for better matches
    pipeline.push({
      $addFields: {
        matchScore: {
          $cond: [
            { $eq: [{ $toLower: "$username" }, query?.toLowerCase()] },
            100, // Exact username match scores highest
            {
              $cond: [
                { $eq: [{ $toLower: "$displayName" }, query?.toLowerCase()] },
                90, // Exact display name match scores high
                {
                  $cond: [
                    { $in: [query, "$walletAddresses"] },
                    80, // Exact wallet match scores high
                    {
                      $cond: [
                        { $regexMatch: { input: { $toLower: "$username" }, regex: `^${query?.toLowerCase()}` } },
                        70, // Username starts with query
                        {
                          $cond: [
                            { $regexMatch: { input: { $toLower: "$displayName" }, regex: `^${query?.toLowerCase()}` } },
                            60, // Display name starts with query
                            50 // Other partial matches
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    });

    // Sort results
    let sortCriteria: any = {};
    
    // If we're searching with a query, sort by match score first
    if (query && query.trim()) {
      sortCriteria = { matchScore: -1 };
    }
    
    // Then apply the requested sort
    if (sortBy === SearchField.USERNAME) {
      sortCriteria.username = sortOrder === SortOrder.ASC ? 1 : -1;
    } else if (sortBy === SearchField.DISPLAY_NAME) {
      sortCriteria.displayName = sortOrder === SortOrder.ASC ? 1 : -1;
    }
    
    pipeline.push({ $sort: sortCriteria });

    // Count total results
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    
    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute search
    try {
      const [users, countResult] = await Promise.all([
        this.userModel.aggregate(pipeline).exec(),
        this.userModel.aggregate(countPipeline).exec(),
      ]);

      // Get the total count
      const total = countResult.length > 0 ? countResult[0].total : 0;
      const pages = Math.ceil(total / limit);

      // Get contacts information if currentUserId is provided
      let contacts: Record<string, boolean> = {};
      if (currentUserId) {
        const userContacts = await this.contactModel.find({ 
          owner: currentUserId,
          status: 'active',
        }).select('user').exec();
        
        contacts = userContacts.reduce((acc, contact) => {
          acc[contact.user.toString()] = true;
          return acc;
        }, {});
      }

      // Map results to DTOs
      const results = users.map(user => {
        // Add contact status if we have currentUserId
        if (currentUserId) {
          user.isContact = contacts[user._id.toString()] || false;
        }
        
        return new UserSearchResultDto(user);
      });

      return {
        results,
        total,
        page,
        pages,
        query: query || '',
      };
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      throw new BadRequestException('Search operation failed');
    }
  }

  /**
   * Find users by wallet address (exact match)
   */
  async findByWalletAddress(walletAddress: string): Promise<UserSearchResultDto[]> {
    try {
      const users = await this.userModel.find({
        walletAddresses: walletAddress,
        status: UserStatus.ACTIVE,
      }).exec();
      
      return users.map(user => new UserSearchResultDto(user.toObject()));
    } catch (error) {
      this.logger.error(`Wallet search error: ${error.message}`, error.stack);
      throw new BadRequestException('Wallet search operation failed');
    }
  }

  /**
   * Find user by username (exact match)
   */
  async findByUsername(username: string): Promise<UserSearchResultDto | null> {
    try {
      const user = await this.userModel.findOne({
        username,
        status: UserStatus.ACTIVE,
      }).exec();
      
      return user ? new UserSearchResultDto(user.toObject()) : null;
    } catch (error) {
      this.logger.error(`Username search error: ${error.message}`, error.stack);
      throw new BadRequestException('Username search operation failed');
    }
  }
}