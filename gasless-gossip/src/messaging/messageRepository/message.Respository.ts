import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { MessageDocument } from '../schemas/message.schema';
import { Message } from '../interfaces/message.interface';
import { MessageStatus } from '../enums/message-status.enum';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectModel(MessageDocument.name) private readonly messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Create a new message
   */
  async create(createMessageDto: CreateMessageDto, sender: string): Promise<Message> {
    const message = new this.messageModel({
      ...createMessageDto,
      sender,
      status: MessageStatus.SENT,
      readBy: [],
      reactions: [],
    });

    return (await message.save()).toObject() as unknown as Message;
  }

  /**
   * Find messages by conversation with pagination
   */
  async findByConversation(
    conversationId: string,
    options: {
      limit?: number;
      before?: Date | string;
      after?: Date | string;
      includeDeleted?: boolean;
    } = {},
  ): Promise<Message[]> {
    const { limit = 50, before, after, includeDeleted = false } = options;

    const query: FilterQuery<MessageDocument> = {
      conversationId,
    };

    if (!includeDeleted) {
      query.isDeleted = { $ne: true };
    }

    if (before) {
      query.createdAt = { ...query.createdAt, $lt: new Date(before) };
    }

    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return messages.map((message) => message.toObject()) as unknown as Message[];
  }

  /**
   * Find messages by sender with pagination
   */
  async findBySender(
    sender: string,
    options: {
      limit?: number;
      before?: Date | string;
      after?: Date | string;
      includeDeleted?: boolean;
    } = {},
  ): Promise<Message[]> {
    const { limit = 50, before, after, includeDeleted = false } = options;

    const query: FilterQuery<MessageDocument> = {
      sender,
    };

    if (!includeDeleted) {
      query.isDeleted = { $ne: true };
    }

    if (before) {
      query.createdAt = { ...query.createdAt, $lt: new Date(before) };
    }

    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return messages.map((message) => message.toObject()) as unknown as Message[];
  }

  /**
   * Find a message by ID
   */
  async findById(id: string): Promise<Message | null> {
    const message = await this.messageModel.findById(id).exec();
    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Find messages that mention a specific user
   */
  async findByMention(
    userId: string,
    options: {
      limit?: number;
      before?: Date | string;
      after?: Date | string;
    } = {},
  ): Promise<Message[]> {
    const { limit = 50, before, after } = options;

    const query: FilterQuery<MessageDocument> = {
      mentions: userId,
      isDeleted: { $ne: true },
    };

    if (before) {
      query.createdAt = { ...query.createdAt, $lt: new Date(before) };
    }

    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return messages.map((message) => message.toObject()) as unknown as Message[];
  }

  /**
   * Find messages containing a token transfer with specific transaction hash
   */
  async findByTransactionHash(transactionHash: string): Promise<Message | null> {
    const message = await this.messageModel
      .findOne({ 'tokenTransfer.transactionHash': transactionHash })
      .exec();
    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Update message status
   */
  async updateStatus(updateDto: UpdateMessageStatusDto, userId: string): Promise<Message | null> {
    const { messageId, status, deliveredAt, readAt } = updateDto;

    const updateQuery: UpdateQuery<MessageDocument> = { status };

    if (status === MessageStatus.DELIVERED && deliveredAt) {
      updateQuery.deliveredAt = new Date(deliveredAt);
    }

    if (status === MessageStatus.READ) {
      // Add user to readBy array if not already included
      updateQuery.$addToSet = { readBy: userId };

      if (readAt) {
        updateQuery.readAt = new Date(readAt);
      } else {
        updateQuery.readAt = new Date();
      }
    }

    const message = await this.messageModel
      .findByIdAndUpdate(messageId, updateQuery, { new: true })
      .exec();
    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<Message | null> {
    // First remove any existing reaction from this user
    await this.messageModel.updateOne({ _id: messageId }, { $pull: { reactions: { userId } } });

    // Then add the new reaction
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $push: {
            reactions: {
              userId,
              emoji,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<Message | null> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $pull: {
            reactions: { userId },
          },
        },
        { new: true },
      )
      .exec();

    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Update token transfer status
   */
  async updateTokenTransferStatus(
    messageId: string,
    status: 'pending' | 'confirmed' | 'failed',
    transactionHash?: string,
  ): Promise<Message | null> {
    const updateQuery: UpdateQuery<MessageDocument> = {
      'tokenTransfer.status': status,
    };

    if (transactionHash) {
      updateQuery['tokenTransfer.transactionHash'] = transactionHash;
    }

    const message = await this.messageModel
      .findByIdAndUpdate(messageId, updateQuery, { new: true })
      .exec();
    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Soft delete a message
   */
  async softDelete(messageId: string): Promise<Message | null> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          isDeleted: true,
          content: '[This message was deleted]',
          attachments: [],
          $unset: { tokenTransfer: '' },
        },
        { new: true },
      )
      .exec();

    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Edit a message's content
   */
  async editContent(messageId: string, content: string): Promise<Message | null> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          content,
          isEdited: true,
        },
        { new: true },
      )
      .exec();

    return message ? (message.toObject() as unknown as Message) : null;
  }

  /**
   * Count unread messages in a conversation for a user
   */
  async countUnreadMessages(conversationId: string, userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId },
      isDeleted: { $ne: true },
    });
  }
}
