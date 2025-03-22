// File: src/modules/messaging/controllers/message.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    Patch,
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
  import { MessageService } from '../services/message.service';
  import { CreateMessageDto } from '../dtos/create-message.dto';
  import { PinMessageDto } from '../dtos/pin-message.dto';
  import { GroupMessageResponseDto, MessageReadReceiptDto } from '../dtos/group-message-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  
  @ApiTags('messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('messages')
  export class MessageController {
    constructor(private readonly messageService: MessageService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new message (direct or group)' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Message created successfully',
      type: GroupMessageResponseDto,
    })
    @ApiBody({ type: CreateMessageDto })
    async createMessage(
      @CurrentUser() userId: string,
      @Body() createMessageDto: CreateMessageDto,
    ) {
      const message = await this.messageService.createMessage(userId, createMessageDto);
      return this.mapToMessageResponse(message, userId);
    }
  
    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get messages from a conversation' })
    @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Messages retrieved successfully',
      type: [GroupMessageResponseDto],
    })
    async getMessages(
      @CurrentUser() userId: string,
      @Param('conversationId') conversationId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ) {
      const result = await this.messageService.getMessages(
        userId,
        conversationId,
        page,
        limit,
      );
      
      return {
        messages: result.messages.map(message => this.mapToMessageResponse(message, userId)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  
    @Get('pinned/:conversationId')
    @ApiOperation({ summary: 'Get pinned messages from a conversation' })
    @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Pinned messages retrieved successfully',
      type: [GroupMessageResponseDto],
    })
    async getPinnedMessages(
      @CurrentUser() userId: string,
      @Param('conversationId') conversationId: string,
    ) {
      const messages = await this.messageService.getPinnedMessages(userId, conversationId);
      return messages.map(message => this.mapToMessageResponse(message, userId));
    }
  
    @Patch(':id/pin')
    @ApiOperation({ summary: 'Pin/unpin a message' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiBody({ type: PinMessageDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Message pinned/unpinned successfully',
      type: GroupMessageResponseDto,
    })
    async pinMessage(
      @CurrentUser() userId: string,
      @Param('id') messageId: string,
      @Body() pinMessageDto: PinMessageDto,
    ) {
      const message = await this.messageService.pinMessage(userId, messageId, pinMessageDto);
      return this.mapToMessageResponse(message, userId);
    }
  
    @Post(':id/read')
    @ApiOperation({ summary: 'Mark a message as read' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Message marked as read',
      type: GroupMessageResponseDto,
    })
    async markAsRead(
      @CurrentUser() userId: string,
      @Param('id') messageId: string,
    ) {
      const message = await this.messageService.markAsRead(userId, messageId);
      return this.mapToMessageResponse(message, userId);
    }
  
    @Get(':id/read-receipts')
    @ApiOperation({ summary: 'Get read receipts for a message' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Read receipts retrieved successfully',
      type: [MessageReadReceiptDto],
    })
    async getReadReceipts(
      @CurrentUser() userId: string,
      @Param('id') messageId: string,
    ) {
      return this.messageService.getReadReceipts(userId, messageId);
    }
  
    @Post('announcement')
    @ApiOperation({ summary: 'Create an announcement message in a group' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Announcement created successfully',
      type: GroupMessageResponseDto,
    })
    @ApiBody({ type: CreateMessageDto })
    async createAnnouncement(
      @CurrentUser() userId: string,
      @Body() createMessageDto: CreateMessageDto,
    ) {
      const message = await this.messageService.createAnnouncement(userId, createMessageDto);
      return this.mapToMessageResponse(message, userId);
    }
  
    /**
     * Map a message to response DTO
     */
    private mapToMessageResponse(message: any, currentUserId: string): GroupMessageResponseDto {
      // Calculate read stats
      const readReceipts = message.readReceipts || [];
      const readBy = readReceipts.map(receipt => ({
        userId: receipt.userId._id ? receipt.userId._id.toString() : receipt.userId.toString(),
        name: receipt.userId.name || 'Unknown User',
        avatarUrl: receipt.userId.avatar,
        readAt: receipt.readAt,
      }));
  
      // Get the total members count (placeholder, should be calculated from conversation)
      const totalMembers = 10; // This should be obtained from the conversation
  
      // Map the message to a response DTO
      return {
        id: message._id.toString(),
        senderId: message.senderId._id ? message.senderId._id.toString() : message.senderId.toString(),
        senderName: message.senderId.name || 'Unknown User',
        senderAvatar: message.senderId.avatar,
        groupId: message.groupId ? message.groupId.toString() : null,
        conversationId: message.conversationId.toString(),
        content: message.content,
        type: message.type,
        isPinned: message.isPinned,
        pinnedBy: message.pinnedBy ? {
          id: message.pinnedBy._id.toString(),
          name: message.pinnedBy.name,
        } : null,
        pinnedAt: message.pinnedAt,
        readBy,
        readCount: readReceipts.length,
        totalMembers,
        mentions: message.mentions && message.mentions.length > 0 
          ? message.mentions.map(mention => ({
              id: mention._id.toString(),
              name: mention.name,
            })) 
          : null,
        replyTo: message.replyToId 
          ? {
              id: message.replyToId._id.toString(),
              content: message.replyToId.content,
              senderId: message.replyToId.senderId._id.toString(),
              senderName: message.replyToId.senderId.name,
            } 
          : null,
        status: message.status,
        metadata: message.metadata,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isDeleted: message.isDeleted,
        deletedAt: message.deletedAt,
        createdAt: message.createdAt,
      };
    }
  }
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
  import { MessageService } from '../services/message.service';
  import { CreateMessageDto } from '../dto/create-message.dto';
  import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
  import { PaginationDto } from '../dto/pagination.dto';
  import { MessageResponseDto } from '../dto/message-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  
  @ApiTags('messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('messages')
  export class MessageController {
    constructor(private readonly messageService: MessageService) {}
  
    @Post()
    @ApiOperation({ summary: 'Send a new message' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Message sent successfully',
      type: MessageResponseDto,
    })
    @ApiBody({ type: CreateMessageDto })
    async sendMessage(
      @CurrentUser() userId: string,
      @Body() createMessageDto: CreateMessageDto,
    ) {
      const message = await this.messageService.sendMessage(userId, createMessageDto);
      return this.mapToMessageResponse(message);
    }
  
    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get messages in a conversation' })
    @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
    @ApiQuery({ type: PaginationDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Messages retrieved successfully',
      type: [MessageResponseDto],
    })
    async getMessagesByConversation(
      @CurrentUser() userId: string,
      @Param('conversationId') conversationId: string,
      @Query() paginationDto: PaginationDto,
    ) {
      const { messages, total, page, limit } = await this.messageService.getMessagesByConversation(
        userId,
        conversationId,
        paginationDto,
      );
      
      return {
        messages: messages.map(message => this.mapToMessageResponse(message)),
        total,
        page,
        limit,
      };
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a message by ID' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Message retrieved successfully',
      type: MessageResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Message not found',
    })
    async getMessageById(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      const message = await this.messageService.getMessageById(id, userId);
      return this.mapToMessageResponse(message);
    }
  
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update message status (delivered, read)' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiBody({ type: UpdateMessageStatusDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Message status updated successfully',
      type: MessageResponseDto,
    })
    async updateMessageStatus(
      @CurrentUser() userId: string,
      @Param('id') id: string,
      @Body() updateStatusDto: UpdateMessageStatusDto,
    ) {
      const message = await this.messageService.updateStatus(id, userId, updateStatusDto);
      return this.mapToMessageResponse(message);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a message' })
    @ApiParam({ name: 'id', description: 'Message ID' })
    @ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Message deleted successfully',
    })
    async deleteMessage(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      await this.messageService.deleteMessage(id, userId);
    }
  
    private mapToMessageResponse(message: any): MessageResponseDto {
      return {
        id: message._id.toString(),
        sender: {
          id: message.sender._id ? message.sender._id.toString() : message.sender.toString(),
          name: message.sender.name || '',
        },
        conversationId: message.conversation.toString(),
        content: message.content,
        status: message.status,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        createdAt: message.createdAt,
      };
    }
  }
  
