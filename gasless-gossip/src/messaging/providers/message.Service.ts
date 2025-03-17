import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
import { Message } from '../interfaces/message.interface';
import { MessageResponseDto } from '../dto/message-response.dto';
import { plainToClass } from 'class-transformer';
import { MessageRepository } from '../messageRepository/message.Respository';

@Injectable()
export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Create a new message
   */
  async createMessage(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.create(createMessageDto, userId);
    return this.transformToDto(message);
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getConversationMessages(
    conversationId: string,
    options: {
      limit?: number;
      before?: string;
      after?: string;
    } = {},
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepository.findByConversation(conversationId, options);
    return messages.map((message) => this.transformToDto(message));
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(messageId: string): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(message);
  }

  /**
   * Update message status (delivered, read)
   */
  async updateMessageStatus(
    updateDto: UpdateMessageStatusDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.updateStatus(updateDto, userId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${updateDto.messageId} not found`);
    }
    return this.transformToDto(message);
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageResponseDto> {
    const message = await this.messageRepository.addReaction(messageId, userId, emoji);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(message);
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<MessageResponseDto> {
    const message = await this.messageRepository.removeReaction(messageId, userId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(message);
  }

  /**
   * Edit a message's content
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    if (message.sender !== userId) {
      throw new ForbiddenException(`You can only edit your own messages`);
    }

    const updatedMessage = await this.messageRepository.editContent(messageId, content);
    if (!updatedMessage) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(updatedMessage);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    if (message.sender !== userId) {
      throw new ForbiddenException(`You can only delete your own messages`);
    }

    const deletedMessage = await this.messageRepository.softDelete(messageId);
    if (!deletedMessage) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(deletedMessage);
  }

  /**
   * Update token transfer status
   */
  async updateTokenTransfer(
    messageId: string,
    status: 'pending' | 'confirmed' | 'failed',
    transactionHash?: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.updateTokenTransferStatus(
      messageId,
      status,
      transactionHash,
    );
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    return this.transformToDto(message);
  }

  /**
   * Get messages that mention a specific user
   */
  async getMentionedMessages(
    userId: string,
    options: {
      limit?: number;
      before?: string;
      after?: string;
    } = {},
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepository.findByMention(userId, options);
    return messages.map((message) => this.transformToDto(message));
  }

  /**
   * Count unread messages in a conversation
   */
  async countUnreadMessages(conversationId: string, userId: string): Promise<number> {
    return this.messageRepository.countUnreadMessages(conversationId, userId);
  }

  /**
   * Transform a message to DTO
   */
  private transformToDto(message: Message): MessageResponseDto {
    return plainToClass(MessageResponseDto, {
      id: message._id,
      conversationId: message.conversationId,
      sender: message.sender,
      content: message.content,
      type: message.type,
      status: message.status,
      readBy: message.readBy,
      reactions: message.reactions,
      replyTo: message.replyTo,
      mentions: message.mentions,
      attachments: message.attachments,
      tokenTransfer: message.tokenTransfer,
      isEdited: message.isEdited,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }
}
