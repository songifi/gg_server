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
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessageService } from './providers/message.Service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from 'src/authentication/guards/jwt.guard';
import { MessageResponseDto } from './dto/message-response.dto';
import { UpdateMessageStatusDto } from './dto/update-message-status.dto';

// Define a custom type for the user object
interface User {
  id: string;
  // Add other properties if needed
}

// Extend the Request interface to include the custom user type
interface CustomRequest extends Request {
  user: User;
}

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
    type: MessageResponseDto,
  })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.createMessage(createMessageDto, req.user.id);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiQuery({ name: 'limit', description: 'Maximum number of messages to return', required: false })
  @ApiQuery({ name: 'before', description: 'Get messages before this timestamp', required: false })
  @ApiQuery({ name: 'after', description: 'Get messages after this timestamp', required: false })
  @ApiResponse({
    status: 200,
    description: 'Messages returned successfully',
    type: [MessageResponseDto],
  })
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ): Promise<MessageResponseDto[]> {
    return this.messageService.getConversationMessages(conversationId, { limit, before, after });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a message by ID' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 200,
    description: 'Message returned successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageById(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.messageService.getMessageById(id);
  }

  @Put('status')
  @ApiOperation({ summary: 'Update message status (delivered, read)' })
  @ApiResponse({
    status: 200,
    description: 'Message status updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateMessageStatus(
    @Body() updateDto: UpdateMessageStatusDto,
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.updateMessageStatus(updateDto, req.user.id);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 201,
    description: 'Reaction added successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async addReaction(
    @Param('id') id: string,
    @Body() body: { emoji: string },
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.addReaction(id, req.user.id, body.emoji);
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async removeReaction(
    @Param('id') id: string,
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.removeReaction(id, req.user.id);
  }

  @Put(':id/content')
  @ApiOperation({ summary: 'Edit a message content' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 200,
    description: 'Message edited successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden: You can only edit your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.editMessage(id, req.user.id, body.content);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden: You can only delete your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @Param('id') id: string,
    @Req() req: CustomRequest,
  ): Promise<MessageResponseDto> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return this.messageService.deleteMessage(id, req.user.id);
  }

  @Put(':id/token-transfer')
  @ApiOperation({ summary: 'Update token transfer status' })
  @ApiParam({ name: 'id', description: 'ID of the message' })
  @ApiResponse({
    status: 200,
    description: 'Token transfer status updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateTokenTransfer(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'confirmed' | 'failed'; transactionHash?: string },
  ): Promise<MessageResponseDto> {
    return this.messageService.updateTokenTransfer(id, body.status, body.transactionHash);
  }

  @Get('mentions/:userId')
  @ApiOperation({ summary: 'Get messages that mention a specific user' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ name: 'limit', description: 'Maximum number of messages to return', required: false })
  @ApiQuery({ name: 'before', description: 'Get messages before this timestamp', required: false })
  @ApiQuery({ name: 'after', description: 'Get messages after this timestamp', required: false })
  @ApiResponse({
    status: 200,
    description: 'Messages returned successfully',
    type: [MessageResponseDto],
  })
  async getMentionedMessages(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ): Promise<MessageResponseDto[]> {
    return this.messageService.getMentionedMessages(userId, { limit, before, after });
  }

  @Get('unread/:conversationId')
  @ApiOperation({ summary: 'Count unread messages in a conversation' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiResponse({ status: 200, description: 'Unread count returned successfully' })
  async countUnreadMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: CustomRequest,
  ): Promise<{ count: number }> {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    const count = await this.messageService.countUnreadMessages(conversationId, req.user.id);
    return { count };
  }
}
