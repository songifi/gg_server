import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageStatus } from '../schemas/message.schema';
import { CreateMessageDto } from '../dto/create-message.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
import { ConversationService } from './conversation.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationService: ConversationService,
  ) {}

  async sendMessage(userId: string, createMessageDto: CreateMessageDto): Promise<MessageDocument> {
    const { conversationId, recipientId, content } = createMessageDto;
    let conversation;

    // If conversationId is provided, verify it exists and user is a participant
    if (conversationId) {
      conversation = await this.conversationService.findById(conversationId);
      
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      
      // Check if user is a participant in the conversation
      const isParticipant = conversation.participants.some(
        (participant) => participant.toString() === userId
      );
      
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }
    } else {
      // Create a new conversation if conversationId is not provided
      conversation = await this.conversationService.create(
        userId,
        {
          participantIds: [recipientId],
          initialMessage: content,
        },
      );
      
      // Return the message created by conversation service
      const lastMessageId = conversation.lastMessage;
      if (lastMessageId) {
        return this.messageModel.findById(lastMessageId).exec();
      }
    }

    // Create and save the new message
    const newMessage = new this.messageModel({
      sender: new Types.ObjectId(userId),
      recipient: new Types.ObjectId(recipientId),
      conversation: new Types.ObjectId(conversation._id),
      content,
      status: MessageStatus.SENT,
    });

    const savedMessage = await newMessage.save();

    // Update the conversation's lastMessage
    await this.conversationService.updateLastMessage(conversation._id, savedMessage._id);

    return savedMessage;
  }

  async getMessagesByConversation(
    userId: string,
    conversationId: string,
    paginationDto: PaginationDto,
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number }> {
    // Verify conversation exists and user is a participant
    const conversation = await this.conversationService.findById(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId
    );
    
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.messageModel.countDocuments({ conversation: new Types.ObjectId(conversationId) });

    // Get messages with pagination and sorting
    const messages = await this.messageModel
      .find({ conversation: new Types.ObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email')
      .exec();

    // Mark unread messages as read if the recipient is the current user
    const unreadMessages = messages.filter(
      (message) => 
        message.status !== MessageStatus.READ && 
        message.recipient.toString() === userId
    );

    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map((message) => 
          this.updateStatus(message._id.toString(), userId, { status: MessageStatus.READ })
        )
      );
    }

    return {
      messages,
      total,
      page,
      limit,
    };
  }

  async getMessageById(messageId: string, userId: string): Promise<MessageDocument> {
    const message = await this.messageModel
      .findById(messageId)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is either the sender or recipient
    const isSenderOrRecipient = 
      message.sender._id.toString() === userId || 
      message.recipient._id.toString() === userId;

    if (!isSenderOrRecipient) {
      throw new ForbiddenException('You do not have access to this message');
    }

    // If the user is the recipient and the message is not read, mark it as read
    if (
      message.recipient._id.toString() === userId && 
      message.status !== MessageStatus.READ
    ) {
      await this.updateStatus(messageId, userId, { status: MessageStatus.READ });
      message.status = MessageStatus.READ;
      message.readAt = new Date();
    }

    return message;
  }

  async updateStatus(
    messageId: string, 
    userId: string, 
    updateStatusDto: UpdateMessageStatusDto
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the recipient can change the message status
    if (message.recipient.toString() !== userId) {
      throw new ForbiddenException('Only the recipient can update message status');
    }

    // Validate status update sequence
    const { status } = updateStatusDto;
    const currentStatus = message.status;

    if (
      (currentStatus === MessageStatus.SENT && status === MessageStatus.READ) ||
      (currentStatus === MessageStatus.READ && status !== MessageStatus.READ)
    ) {
      throw new BadRequestException(`Cannot change status from ${currentStatus} to ${status}`);
    }

    // Update the message status and timestamps
    const updates: any = { status };
    
    if (status === MessageStatus.DELIVERED && !message.deliveredAt) {
      updates.deliveredAt = new Date();
    } else if (status === MessageStatus.READ && !message.readAt) {
      updates.readAt = new Date();
      updates.deliveredAt = message.deliveredAt || new Date();
    }

    return this.messageModel
      .findByIdAndUpdate(messageId, updates, { new: true })
      .exec();
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the sender can delete the message
    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    await message.deleteOne();
  }
}
