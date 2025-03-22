// File: src/modules/messaging/services/message.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageType, MessageStatus, ReadReceipt } from '../schemas/message.schema';
import { Conversation, ConversationDocument, ConversationType, MemberRole } from '../../conversation/schemas/conversation.schema';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { PinMessageDto } from '../dtos/pin-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationService } from '../../conversation/services/conversation.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly conversationService: ConversationService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a new message in a conversation
   */
  async createMessage(senderId: string, createMessageDto: CreateMessageDto): Promise<MessageDocument> {
    try {
      const { conversationId, recipientId, groupId, content, type = MessageType.TEXT, replyToId, metadata, mentionIds } = createMessageDto;

      // Check if conversation exists
      const conversation = await this.conversationModel.findById(conversationId).exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify sender is a member of the conversation
      const isMember = this.isMemberOfConversation(conversation, senderId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this conversation');
      }

      // Check if the conversation is an announcement group and validate sender permissions
      if (conversation.isAnnouncementGroup && !this.hasAnnouncementPermission(conversation, senderId)) {
        throw new ForbiddenException('Only admins can send messages in announcement groups');
      }

      // Check message type and sender permissions
      if (type === MessageType.ANNOUNCEMENT && !this.hasAnnouncementPermission(conversation, senderId)) {
        throw new ForbiddenException('Only admins can send announcement messages');
      }

      // Check if members can send messages in group
      if (conversation.type === ConversationType.GROUP && !conversation.canMembersSendMessages && 
          !this.hasAdminPermission(conversation, senderId)) {
        throw new ForbiddenException('Members cannot send messages in this group');
      }

      // For group messages, ensure we use the group ID
      const groupIdToUse = conversation.type === ConversationType.GROUP 
        ? conversation._id 
        : groupId;

      // For direct messages, ensure we use recipient ID
      const recipientIdToUse = conversation.type === ConversationType.DIRECT 
        ? conversation.members.find(m => m.userId.toString() !== senderId)?.userId 
        : recipientId;

      // If replying to a message, check if it exists
      if (replyToId) {
        const replyMessage = await this.messageModel.findOne({
          _id: replyToId,
          conversationId,
        }).exec();

        if (!replyMessage) {
          throw new NotFoundException('Message to reply to not found');
        }
      }

      // Process mentions and validate they are in the conversation
      let validMentions: Types.ObjectId[] = [];
      if (mentionIds && mentionIds.length > 0) {
        validMentions = await this.validateMentions(mentionIds, conversation);
      }

      // Create the message
      const newMessage = new this.messageModel({
        senderId: new Types.ObjectId(senderId),
        conversationId: new Types.ObjectId(conversationId),
        recipientId: recipientIdToUse ? new Types.ObjectId(recipientIdToUse) : undefined,
        groupId: groupIdToUse ? new Types.ObjectId(groupIdToUse) : undefined,
        content,
        type,
        replyToId: replyToId ? new Types.ObjectId(replyToId) : undefined,
        metadata,
        mentions: validMentions,
        status: MessageStatus.SENT,
      });

      const savedMessage = await newMessage.save();

      // Update conversation's lastMessage
      await this.conversationService.updateLastMessage(conversationId, savedMessage._id.toString());

      // Update unread counts for members
      await this.updateUnreadCountsForMembers(conversation, senderId);

      // Populate sender and other related fields
      const populatedMessage = await this.messageModel
        .findById(savedMessage._id)
        .populate('senderId', 'name avatar')
        .populate('mentions', 'name avatar')
        .populate({
          path: 'replyToId',
          select: 'content senderId',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .exec();

      // Emit event for real-time updates
      if (conversation.type === ConversationType.GROUP) {
        this.eventEmitter.emit('message.group.created', {
          message: populatedMessage,
          conversation,
          mentionedUserIds: validMentions.map(id => id.toString()),
        });
      } else {
        this.eventEmitter.emit('message.created', {
          message: populatedMessage,
          conversation,
          mentionedUserIds: validMentions.map(id => id.toString()),
        });
      }

      return populatedMessage;
    } catch (error) {
      this.logger.error(`Failed to create message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get messages from a conversation with pagination
   */
  async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number }> {
    try {
      // Check if conversation exists
      const conversation = await this.conversationModel.findById(conversationId).exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify user is a member of the conversation
      const isMember = this.isMemberOfConversation(conversation, userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this conversation');
      }

      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.messageModel.countDocuments({ conversationId }).exec();

      // Get messages with pagination
      const messages = await this.messageModel
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name avatar')
        .populate('mentions', 'name avatar')
        .populate({
          path: 'replyToId',
          select: 'content senderId',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .populate('pinnedBy', 'name avatar')
        .exec();

      // Add current user to read receipts if not already added
      const messagesToUpdate = messages.filter(
        (msg) => 
          msg.senderId._id.toString() !== userId && 
          !msg.readReceipts.some((receipt) => receipt.userId.toString() === userId)
      );

      if (messagesToUpdate.length > 0) {
        const readReceipt: ReadReceipt = {
          userId: new Types.ObjectId(userId),
          readAt: new Date(),
        };

        await Promise.all(
          messagesToUpdate.map((msg) =>
            this.messageModel.findByIdAndUpdate(
              msg._id,
              {
                $push: { readReceipts: readReceipt },
              },
              { new: true }
            ).exec()
          )
        );

        // For each message update, emit read receipt event
        messagesToUpdate.forEach((msg) => {
          this.eventEmitter.emit('message.read', {
            messageId: msg._id,
            userId,
            conversationId,
            readAt: readReceipt.readAt,
            isGroupMessage: conversation.type === ConversationType.GROUP,
          });
        });
      }

      // Reset unread count for the user
      await this.conversationService.resetUnreadCount(conversationId, userId);

      return {
        messages,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pinned messages from a conversation
   */
  async getPinnedMessages(
    userId: string,
    conversationId: string,
  ): Promise<MessageDocument[]> {
    try {
      // Check if conversation exists
      const conversation = await this.conversationModel.findById(conversationId).exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify user is a member of the conversation
      const isMember = this.isMemberOfConversation(conversation, userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this conversation');
      }

      // Get pinned messages
      const pinnedMessages = await this.messageModel
        .find({
          conversationId,
          isPinned: true,
        })
        .sort({ pinnedAt: -1 })
        .populate('senderId', 'name avatar')
        .populate('pinnedBy', 'name avatar')
        .populate('mentions', 'name avatar')
        .populate({
          path: 'replyToId',
          select: 'content senderId',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .exec();

      return pinnedMessages;
    } catch (error) {
      this.logger.error(`Failed to get pinned messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Pin/unpin a message in a conversation
   */
  async pinMessage(
    userId: string,
    messageId: string,
    pinMessageDto: PinMessageDto,
  ): Promise<MessageDocument> {
    try {
      // Check if message exists
      const message = await this.messageModel.findById(messageId).exec();

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check if conversation exists
      const conversation = await this.conversationModel
        .findById(message.conversationId)
        .exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify user is a member of the conversation
      const isMember = this.isMemberOfConversation(conversation, userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this conversation');
      }

      // Check if user has permission to pin messages
      if (!this.hasPinPermission(conversation, userId)) {
        throw new ForbiddenException('You do not have permission to pin messages in this conversation');
      }

      const { isPinned } = pinMessageDto;

      // Update the message
      if (isPinned && !message.isPinned) {
        // Pin the message
        message.isPinned = true;
        message.pinnedBy = new Types.ObjectId(userId);
        message.pinnedAt = new Date();

        // Add to conversation's pinnedMessages if not already there
        if (!conversation.pinnedMessages.some(id => id.toString() === messageId)) {
          conversation.pinnedMessages.push(new Types.ObjectId(messageId));
          await conversation.save();
        }
      } else if (!isPinned && message.isPinned) {
        // Unpin the message
        message.isPinned = false;
        message.pinnedBy = undefined;
        message.pinnedAt = undefined;

        // Remove from conversation's pinnedMessages
        conversation.pinnedMessages = conversation.pinnedMessages.filter(
          id => id.toString() !== messageId
        );
        await conversation.save();
      }

      const savedMessage = await message.save();

      // Populate sender and other related fields
      const populatedMessage = await this.messageModel
        .findById(savedMessage._id)
        .populate('senderId', 'name avatar')
        .populate('pinnedBy', 'name avatar')
        .populate('mentions', 'name avatar')
        .populate({
          path: 'replyToId',
          select: 'content senderId',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .exec();

      // Emit event for real-time updates
      this.eventEmitter.emit('message.pinned', {
        message: populatedMessage,
        conversation,
        isPinned,
        pinnedBy: userId,
      });

      return populatedMessage;
    } catch (error) {
      this.logger.error(`Failed to pin message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a message as read by user
   */
  async markAsRead(
    userId: string,
    messageId: string,
  ): Promise<MessageDocument> {
    try {
      // Check if message exists
      const message = await this.messageModel.findById(messageId).exec();

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check if user is sender
      if (message.senderId.toString() === userId) {
        // Sender doesn't need to mark their own messages as read
        return message;
      }

      // Check if user already has a read receipt
      const hasReadReceipt = message.readReceipts.some(
        receipt => receipt.userId.toString() === userId
      );

      if (!hasReadReceipt) {
        // Add read receipt
        const readReceipt: ReadReceipt = {
          userId: new Types.ObjectId(userId),
          readAt: new Date(),
        };

        const updatedMessage = await this.messageModel
          .findByIdAndUpdate(
            messageId,
            {
              $push: { readReceipts: readReceipt },
            },
            { new: true }
          )
          .populate('senderId', 'name avatar')
          .populate('pinnedBy', 'name avatar')
          .populate('mentions', 'name avatar')
          .populate({
            path: 'replyToId',
            select: 'content senderId',
            populate: {
              path: 'senderId',
              select: 'name avatar',
            },
          })
          .exec();

        // Check if this is a group message
        const isGroupMessage = !!message.groupId;

        // Emit event for real-time updates
        this.eventEmitter.emit('message.read', {
          messageId,
          userId,
          conversationId: message.conversationId.toString(),
          readAt: readReceipt.readAt,
          isGroupMessage,
        });

        return updatedMessage;
      }

      return message;
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get read receipts for a message
   */
  async getReadReceipts(
    userId: string,
    messageId: string,
  ): Promise<Array<{ userId: string; name: string; avatarUrl?: string; readAt: Date }>> {
    try {
      // Check if message exists
      const message = await this.messageModel
        .findById(messageId)
        .populate({
          path: 'readReceipts.userId',
          select: 'name avatar',
        })
        .exec();

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check if conversation exists
      const conversation = await this.conversationModel
        .findById(message.conversationId)
        .exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify user is a member of the conversation
      const isMember = this.isMemberOfConversation(conversation, userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this conversation');
      }

      // Map read receipts to response format
      return message.readReceipts.map(receipt => ({
        userId: receipt.userId._id.toString(),
        name: receipt.userId.name,
        avatarUrl: receipt.userId.avatar,
        readAt: receipt.readAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get read receipts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create an announcement message
   */
  async createAnnouncement(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageDocument> {
    try {
      // Ensure message type is set to announcement
      createMessageDto.type = MessageType.ANNOUNCEMENT;

      // Use regular message creation with announcement type
      return this.createMessage(senderId, createMessageDto);
    } catch (error) {
      this.logger.error(`Failed to create announcement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update unread counts for all members except sender
   */
  private async updateUnreadCountsForMembers(
    conversation: ConversationDocument,
    senderId: string,
  ): Promise<void> {
    try {
      // Get all members except sender
      const memberIds = conversation.members
        .filter(member => member.userId.toString() !== senderId && !member.hasLeft)
        .map(member => member.userId);

      // Update unread count for each member
      await this.conversationModel.updateOne(
        { _id: conversation._id },
        {
          $inc: {
            'members.$[elem].unreadCount': 1,
          },
        },
        {
          arrayFilters: [
            {
              'elem.userId': { $in: memberIds },
              'elem.hasLeft': false,
            },
          ],
        }
      ).exec();
    } catch (error) {
      this.logger.error(`Failed to update unread counts: ${error.message}`, error.stack);
      // Don't throw the error as this is a non-critical operation
    }
  }

  /**
   * Check if a user is a member of a conversation
   */
  private isMemberOfConversation(
    conversation: ConversationDocument,
    userId: string,
  ): boolean {
    return conversation.members.some(
      member => member.userId.toString() === userId && !member.hasLeft
    );
  }

  /**
   * Check if a user has admin permission in a conversation
   */
  private hasAdminPermission(
    conversation: ConversationDocument,
    userId: string,
  ): boolean {
    const member = conversation.members.find(
      member => member.userId.toString() === userId && !member.hasLeft
    );

    if (!member) {
      return false;
    }

    return [MemberRole.OWNER, MemberRole.ADMIN].includes(member.role);
  }

  /**
   * Check if a user has permission to send announcements
   */
  private hasAnnouncementPermission(
    conversation: ConversationDocument,
    userId: string,
  ): boolean {
    return this.hasAdminPermission(conversation, userId);
  }

  /**
   * Check if a user has permission to pin messages
   */
  private hasPinPermission(
    conversation: ConversationDocument,
    userId: string,
  ): boolean {
    const member = conversation.members.find(
      member => member.userId.toString() === userId && !member.hasLeft
    );

    if (!member) {
      return false;
    }

    return [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.MODERATOR].includes(member.role);
  }

  /**
   * Validate and process mentions
   */
  private async validateMentions(
    mentionIds: string[],
    conversation: ConversationDocument,
  ): Promise<Types.ObjectId[]> {
    // Check that all mentioned users are in the conversation
    const validMentionIds = mentionIds.filter(id => 
      conversation.members.some(member => 
        member.userId.toString() === id && !member.hasLeft
      )
    );

    return validMentionIds.map(id => new Types.ObjectId(id));
  }
}
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
