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
  import { PaginationDto } from '../dto/pagination.dto';
  import { ConversationResponseDto } from '../dto/conversation-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  import { IsArray, IsMongoId, ArrayMinSize } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  class AddParticipantsDto {
    @ApiProperty({
      description: 'User IDs to add to the conversation',
      example: ['60d21b4667d0d8992e610c85'],
      type: [String],
    })
    @IsArray()
    @IsMongoId({ each: true })
    @ArrayMinSize(1)
    participantIds: string[];
  }
  
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
      return this.mapToConversationResponse(conversation);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get user conversations' })
    @ApiQuery({ type: PaginationDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversations retrieved successfully',
      type: [ConversationResponseDto],
    })
    async getUserConversations(
      @CurrentUser() userId: string,
      @Query() paginationDto: PaginationDto,
    ) {
      const { conversations, total, page, limit } = await this.conversationService.getUserConversations(
        userId,
        paginationDto,
      );
      
      return {
        conversations: conversations.map(conversation => this.mapToConversationResponse(conversation)),
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
      const conversation = await this.conversationService.findById(id);
      
      // Check if user is a participant
      const isParticipant = conversation.participants.some(
        (participant: any) => participant._id.toString() === userId
      );
      
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }
      
      return this.mapToConversationResponse(conversation);
    }
  
    @Patch(':id/participants')
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
        addParticipantsDto.participantIds,
      );
      return this.mapToConversationResponse(conversation);
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
      return this.mapToConversationResponse(conversation);
    }
  
    @Delete(':id/leave')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Leave a conversation' })
    @ApiParam({ name: 'id', description: 'Conversation ID' })
    @ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Left conversation successfully',
    })
    async leaveConversation(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      await this.conversationService.leaveConversation(id, userId);
    }
  
    private mapToConversationResponse(conversation: any): ConversationResponseDto {
      const mappedConversation: ConversationResponseDto = {
        id: conversation._id.toString(),
        participants: conversation.participants.map((participant: any) => ({
          id: participant._id ? participant._id.toString() : participant.toString(),
          name: participant.name || '',
          email: participant.email || '',
        })),
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
  
      if (conversation.lastMessage) {
        mappedConversation.lastMessage = {
          id: conversation.lastMessage._id.toString(),
          content: conversation.lastMessage.content,
          createdAt: conversation.lastMessage.createdAt,
          senderId: conversation.lastMessage.sender._id 
            ? conversation.lastMessage.sender._id.toString() 
            : conversation.lastMessage.sender.toString(),
        };
      }
  
      return mappedConversation;
    }
  }
  