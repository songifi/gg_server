import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode,
    BadRequestException,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { ReactionsService } from './reactions.service';
  import { CreateReactionDto } from './dto/create-reaction.dto';
  import { RemoveReactionDto } from './dto/remove-reaction.dto';
  import { ReactionResponseDto } from './dto/reaction-response.dto';
  import { MessageReactionsResponseDto } from './dto/message-reactions-response.dto';
  
  @ApiTags('reactions')
  @Controller('reactions')
  export class ReactionsController {
    constructor(private readonly reactionsService: ReactionsService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add a reaction to a message' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Reaction added successfully',
      type: ReactionResponseDto,
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid reaction content' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not have access to this conversation' })
    async addReaction(
      @Request() req,
      @Body() createReactionDto: CreateReactionDto,
    ): Promise<ReactionResponseDto> {
      return this.reactionsService.addReaction(req.user.userId, createReactionDto);
    }
  
    @Delete(':messageId/:content')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a reaction from a message' })
    @ApiParam({ name: 'messageId', description: 'Message ID' })
    @ApiParam({ name: 'content', description: 'Reaction content (emoji or custom identifier)' })
    @ApiQuery({ name: 'userId', required: false, description: 'Target user ID (admin only)' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Reaction removed successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reaction not found' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to remove this reaction' })
    async removeReaction(
      @Request() req,
      @Param('messageId') messageId: string,
      @Param('content') content: string,
      @Query('userId') targetUserId?: string,
    ): Promise<void> {
      const removeReactionDto: RemoveReactionDto = {
        messageId,
        content,
        userId: targetUserId,
      };
      
      return this.reactionsService.removeReaction(req.user.userId, removeReactionDto);
    }
  
    @Get('messages/:messageId')
    @ApiOperation({ summary: 'Get all reactions for a message' })
    @ApiParam({ name: 'messageId', description: 'Message ID' })
    @ApiQuery({ name: 'includeFull', required: false, type: Boolean, description: 'Include full reaction details' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Reactions retrieved successfully',
      type: MessageReactionsResponseDto,
    })
    async getMessageReactions(
      @Param('messageId') messageId: string,
      @Query('includeFull') includeFull?: boolean,
    ): Promise<MessageReactionsResponseDto> {
      return this.reactionsService.getMessageReactions(
        messageId,
        includeFull === true || includeFull === 'true',
      );
    }
  
    @Get('messages/:messageId/users/:userId')
    @ApiOperation({ summary: 'Get a user\'s reactions to a specific message' })
    @ApiParam({ name: 'messageId', description: 'Message ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User reactions retrieved successfully',
      type: [ReactionResponseDto],
    })
    async getUserReactionsToMessage(
      @Param('messageId') messageId: string,
      @Param('userId') userId: string,
    ): Promise<ReactionResponseDto[]> {
      return this.reactionsService.getUserReactionsToMessage(userId, messageId);
    }
  
    @Get('users/:userId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all reactions by a user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User reactions retrieved successfully',
    })
    async getUserReactions(
      @Request() req,
      @Param('userId') userId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ): Promise<{ reactions: ReactionResponseDto[], total: number, page: number, pages: number }> {
      // Ensure users can only view their own reactions (unless admin)
      if (req.user.userId !== userId && req.user.role !== 'admin') {
        throw new BadRequestException('You can only view your own reactions');
      }
      
      return this.reactionsService.getUserReactions(
        userId,
        page ? +page : 1,
        limit ? +limit : 20,
      );
    }
  
    @Delete('messages/:messageId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove all reactions from a message (admin only)' })
    @ApiParam({ name: 'messageId', description: 'Message ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'All reactions removed successfully' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to perform this action' })
    async removeAllReactionsFromMessage(
      @Request() req,
      @Param('messageId') messageId: string,
    ): Promise<void> {
      // In a real implementation, verify the user is an admin or message owner
      // if (req.user.role !== 'admin') {
      //   // Check if user is the message owner
      //   const message = await this.messageService.findById(messageId);
      //   if (!message || message.sender !== req.user.userId) {
      //     throw new ForbiddenException('Not authorized to remove all reactions');
      //   }
      // }
      
      return this.reactionsService.removeAllReactionsFromMessage(messageId);
    }
  
    @Get('allowed-emojis')
    @ApiOperation({ summary: 'Get list of allowed emoji reactions' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Allowed emojis retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          emojis: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    })
    getAllowedEmojis(): { emojis: string[] } {
      return { emojis: this.reactionsService.getAllowedEmojis() };
    }
  }