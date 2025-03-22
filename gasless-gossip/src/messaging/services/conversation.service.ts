import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../schemas/conversation.schema';
import { Message, MessageDocument, MessageStatus } from '../schemas/message.schema';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { PaginationDto } from '../dto/pagination.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(userId: string, createConversationDto: CreateConversationDto): Promise<ConversationDocument> {
    const { participantIds, title, initialMessage } = createConversationDto;

    // Ensure no duplicates and include the creator
    const uniqueParticipantIds = [...new Set([userId, ...participantIds])];
    
    // Create the conversation
    const newConversation = new this.conversationModel({
      participants: uniqueParticipantIds.map(id => new Types.ObjectId(id)),
      title,
    });

    const savedConversation = await newConversation.save();

    // Create the initial message if provided
    if (initialMessage) {
      const message = new this.messageModel({
        sender: new Types.ObjectId(userId),
        recipient: new Types.ObjectId(participantIds[0]), // Use the first participant as recipient
        conversation: savedConversation._id,
        content: initialMessage,
        status: MessageStatus.SENT,
      });

      const savedMessage = await message.save();

      // Update conversation with lastMessage
      savedConversation.lastMessage = savedMessage._id;
      await savedConversation.save();
    }

    return savedConversation;
  }

  async findById(conversationId: string): Promise<ConversationDocument> {
    return this.conversationModel
      .findById(conversationId)
      .populate('participants', 'name email')
      .populate('lastMessage')
      .exec();
  }

  async getUserConversations(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<{ conversations: ConversationDocument[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.conversationModel.countDocuments({
      participants: new Types.ObjectId(userId),
    });

    // Get conversations with pagination and sorting by last update
    const conversations = await this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants', 'name email')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name',
        },
      })
      .exec();

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  async updateLastMessage(conversationId: string, messageId: string): Promise<void> {
    await this.conversationModel
      .findByIdAndUpdate(conversationId, {
        lastMessage: new Types.ObjectId(messageId),
      })
      .exec();
  }

  async addParticipants(
    conversationId: string,
    userId: string,
    participantIds: string[],
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Add new participants
    const existingParticipantIds = conversation.participants.map(p => p.toString());
    const newParticipantIds = participantIds.filter(id => !existingParticipantIds.includes(id));

    if (newParticipantIds.length === 0) {
      return conversation;
    }

    conversation.participants = [
      ...conversation.participants,
      ...newParticipantIds.map(id => new Types.ObjectId(id)),
    ];

    return conversation.save();
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    participantId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Cannot remove yourself if you're the only participant
    if (
      userId === participantId && 
      conversation.participants.length === 1
    ) {
      throw new BadRequestException('Cannot remove the only participant from a conversation');
    }

    // Remove the participant
    conversation.participants = conversation.participants.filter(
      (participant) => participant.toString() !== participantId
    );

    return conversation.save();
  }

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // If user is the only participant, delete the conversation
    if (conversation.participants.length === 1) {
      await conversation.deleteOne();
      return;
    }

    // Remove the user from participants
    conversation.participants = conversation.participants.filter(
      (participant) => participant.toString() !== userId
    );

    await conversation.save();
  }
}
