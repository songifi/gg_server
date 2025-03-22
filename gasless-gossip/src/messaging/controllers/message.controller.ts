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
  