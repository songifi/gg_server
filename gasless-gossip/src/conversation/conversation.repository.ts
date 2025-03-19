import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Conversation, ConversationDocument } from './schema/conversation.schema';
import { BaseRepository } from 'src/database/base.repository';

@Injectable()
export class ConversationRepository extends BaseRepository<ConversationDocument> {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {
    super(conversationModel);
  }

  async getConversationsByUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.conversationModel
      .find({ participants: userId })
      .sort({ lastMessageAt: -1 }) // Most recent conversations
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async updateMetadata(
    conversationId: string,
    updateData: Partial<{ title: string; isActive: boolean }>,
  ) {
    return this.conversationModel
      .findByIdAndUpdate(conversationId, updateData, { new: true })
      .exec();
  }
}
