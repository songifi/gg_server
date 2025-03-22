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
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  import { ConversationService } from '../services/conversation.service';
  import { CreateConversationDto } from '../dto/create-conversation.dto';
  import { UpdateConversationDto } from '../dto/update-conversation.dto';
  import { AddParticipantsDto } from '../dto/add-participants.dto';
  import { PaginationDto } from '../dto/pagination.dto';
  import { ConversationResponseDto } from '../dto/conversation-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  
  @ApiTags('conversations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('conversations')
  export class ConversationController {
    constructor(private readonly conversationService: ConversationService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new conversation' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Conversation created successfully',
      type: ConversationResponseDto,
    })
    @ApiBody({ type: CreateConversationDto })
    async createConversation(
      @CurrentUser() userId: string,
      @Body() createConversationDto: CreateConversationDto,
    ) {
      const conversation = await this.conversationService.create(userId, createConversationDto);
      return this.mapToConversationResponse(conversation, userId);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all conversations for the authenticated user' })
    @ApiQuery({ type: PaginationDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversations retrieved successfully',
      type: [ConversationResponseDto],
    })
    async getConversations(
      @CurrentUser() userId: string,
      @Query() paginationDto: PaginationDto,
    ) {
      const { conversations, total, page, limit } = await this.conversationService.findAll(
        userId,
        paginationDto,
      );
      
      return {
        conversations: conversations.map(conv => this.mapToConversationResponse(conv, userId)),
        total,
        page,
        limit,
      };
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a conversation by ID' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversation retrieved successfully',
      type: ConversationResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Conversation not found',
    })
    async getConversationById(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      const conversation = await this.conversationService.findById(id, userId);
      return this.mapToConversationResponse(conversation, userId);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a conversation' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiBody({ type: UpdateConversationDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversation updated successfully',
      type: ConversationResponseDto,
    })
    async updateConversation(
      @CurrentUser() userId: string,
      @Param('id') id: string,
      @Body() updateConversationDto: UpdateConversationDto,
    ) {
      const conversation = await this.conversationService.update(
        id,
        userId,
        updateConversationDto,
      );
      return this.mapToConversationResponse(conversation, userId);
    }
  
    @Post(':id/participants')
    @ApiOperation({ summary: 'Add participants to a conversation' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiBody({ type: AddParticipantsDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Participants added successfully',
      type: ConversationResponseDto,
    })
    async addParticipants(
      @CurrentUser() userId: string,
      @Param('id') id: string,
      @Body() addParticipantsDto: AddParticipantsDto,
    ) {
      const conversation = await this.conversationService.addParticipants(
        id,
        userId,
        addParticipantsDto,
      );
      return this.mapToConversationResponse(conversation, userId);
    }
  
    @Delete(':id/participants/:participantId')
    @ApiOperation({ summary: 'Remove a participant from a conversation' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiParam({ name: 'participantId', description: 'Participant user ID to remove' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Participant removed successfully',
      type: ConversationResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Conversation deleted after removing last participant',
    })
    async removeParticipant(
      @CurrentUser() userId: string,
      @Param('id') id: string,
      @Param('participantId') participantId: string,
    ) {
      const conversation = await this.conversationService.removeParticipant(
        id,
        userId,
        participantId,
      );
      
      // If the conversation was deleted (no participants left)
      if (!conversation) {
        return { message: 'Conversation deleted as no participants remain' };
      }
      
      return this.mapToConversationResponse(conversation, userId);
    }
  
    @Post(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark a conversation as read' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversation marked as read',
      type: ConversationResponseDto,
    })
    async markAsRead(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      const conversation = await this.conversationService.markAsRead(id, userId);
      return this.mapToConversationResponse(conversation, userId);
    }
  
    /**
     * Map a conversation document to a response DTO, including current user's unread count
     */
    private mapToConversationResponse(
      conversation: any, 
      currentUserId: string
    ): ConversationResponseDto {
      // Calculate total unread messages for the current user
      const currentUserParticipant = conversation.participants.find(
        (p) => p.userId._id ? p.userId._id.toString() === currentUserId : p.userId.toString() === currentUserId
      );
      
      const totalUnread = currentUserParticipant ? currentUserParticipant.unreadCount : 0;
  
      // Map the conversation to a response DTO
      const response: ConversationResponseDto = {
        id: conversation._id.toString(),
        title: conversation.title,
        isGroup: conversation.isGroup,
        participants: conversation.participants.map((p) => {
          const userId = p.userId._id ? p.userId._id.toString() : p.userId.toString();
          return {
            id: userId,
            name: p.userId.name || 'Unknown User',
            avatar: p.userId.avatar,
            unreadCount: p.unreadCount,
            lastReadAt: p.lastReadAt,
            hasLeft: p.hasLeft,
            joinedAt: p.joinedAt,
          };
        }),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        totalUnread,
      };
  
      // Add last message details if available
      if (conversation.lastMessage) {
        response.lastMessage = {
          id: conversation.lastMessage._id ? conversation.lastMessage._id.toString() : conversation.lastMessage.toString(),
          text: conversation.lastMessageText || '',
          sender: {
            id: conversation.lastMessageSender._id 
              ? conversation.lastMessageSender._id.toString() 
              : conversation.lastMessageSender.toString(),
            name: conversation.lastMessageSender.name || 'Unknown User',
          },
          createdAt: conversation.lastMessageAt,
        };
      }
  
      return response;
    }
  }
  