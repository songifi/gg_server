import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    Request, 
    Param,
    HttpStatus,
    UseInterceptors,
    ClassSerializerInterceptor,
  } from '@nestjs/common';
  import { 
    ApiBearerAuth, 
    ApiOperation, 
    ApiParam, 
    ApiQuery, 
    ApiResponse, 
    ApiTags, 
  } from '@nestjs/swagger';
  import { Throttle } from '@nestjs/throttler';
  import { JwtAuthGuard } from '../auths/guards/jwt-auth.guard';
  import { UserSearchService } from './user-search.service';
  import { SearchUserDto, SearchField, SortOrder } from './dto/search-user.dto';
  import { UserSearchResponseDto, UserSearchResultDto } from './dto/user-search-response.dto';
  
  @ApiTags('user-search')
  @Controller('user-search')
  @UseInterceptors(ClassSerializerInterceptor)
  export class UserSearchController {
    constructor(private readonly userSearchService: UserSearchService) {}
  
    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle(10, 60) // Rate limit: 10 requests per minute
    @ApiOperation({ summary: 'Search for users' })
    @ApiQuery({ name: 'query', required: false, description: 'Search query string' })
    @ApiQuery({ 
      name: 'fields', 
      required: false, 
      description: 'Fields to search in', 
      enum: SearchField,
      isArray: true,
    })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (starting from 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Results per page (1-100)' })
    @ApiQuery({ 
      name: 'sortBy', 
      required: false, 
      description: 'Field to sort by', 
      enum: SearchField,
    })
    @ApiQuery({ 
      name: 'sortOrder', 
      required: false, 
      description: 'Sort order', 
      enum: SortOrder,
    })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Users found successfully', 
      type: UserSearchResponseDto,
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid search parameters' })
    async searchUsers(
      @Query() searchDto: SearchUserDto,
      @Request() req,
    ): Promise<UserSearchResponseDto> {
      // Set current user ID for privacy checks
      searchDto.currentUserId = req.user.userId;
      
      // Exclude the current user from results by default
      if (!searchDto.excludeUserId) {
        searchDto.excludeUserId = req.user.userId;
      }
      
      return this.userSearchService.searchUsers(searchDto);
    }
  
    @Get('wallet/:address')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle(20, 60) // Rate limit: 20 requests per minute
    @ApiOperation({ summary: 'Find users by wallet address' })
    @ApiParam({ name: 'address', description: 'Wallet address to search for' })
    @ApiResponse({ 
      status: HttpStatus.OK,
      description: 'Users found successfully',
      type: [UserSearchResultDto],
    })
    async findByWalletAddress(@Param('address') address: string): Promise<UserSearchResultDto[]> {
      return this.userSearchService.findByWalletAddress(address);
    }
  
    @Get('username/:username')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle(20, 60) // Rate limit: 20 requests per minute
    @ApiOperation({ summary: 'Find user by exact username' })
    @ApiParam({ name: 'username', description: 'Username to search for' })
    @ApiResponse({ 
      status: HttpStatus.OK,
      description: 'User found or null if not found',
      type: UserSearchResultDto,
    })
    async findByUsername(@Param('username') username: string): Promise<UserSearchResultDto | null> {
      return this.userSearchService.findByUsername(username);
    }
  }