import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument, Participant } from '../schemas/conversation.schema';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { AddParticipantsDto } from '../dto/add-participants.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private readonly userService: UserService, // Inject a user service to get user information
  ) {}

  /**
   * Create a new conversation
   */
  async create(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    const { title, isGroup = false, participantIds } = createConversationDto;

    // Validate group conversations must have a title
    if (isGroup && !title) {
      throw new BadRequestException('Group conversations require a title');
    }

    // For direct messages, ensure only 1 participant (the recipient) is provided
    if (!isGroup && participantIds.length !== 1) {
      throw new BadRequestException('Direct messages must have exactly one recipient');
    }

    // Ensure user is not creating a conversation with themselves only
    if (participantIds.length === 1 && participantIds[0] === userId) {
      throw new BadRequestException('Cannot create a conversation with yourself only');
    }

    // Check if the users exist
    const validParticipantIds = await this.validateUsers([userId, ...participantIds]);

    // For direct messages, check if a conversation already exists between the two users
    if (!isGroup) {
      const existingConversation = await this.findDirectConversation(userId, participantIds[0]);
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create participants array with the creator and recipients
    const participants: Participant[] = validParticipantIds.map((id) => ({
      userId: new Types.ObjectId(id),
      unreadCount: id === userId ? 0 : 0, // Creator has 0 unread messages
      hasLeft: false,
      joinedAt: new Date(),
    }));

    // Create the new conversation
    const newConversation = new this.conversationModel({
      title: isGroup ? title : undefined,
      isGroup,
      participants,
      createdBy: new Types.ObjectId(userId),
    });

    return newConversation.save();
  }

  /**
   * Get a conversation by ID
   */
  async findById(conversationId: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants.userId', 'name avatar')
      .populate('lastMessageSender', 'name')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant in the conversation
    this.validateParticipation(conversation, userId);

    return conversation;
  }

  /**
   * Find a direct conversation between two users
   */
  async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument | null> {
    // Find a non-group conversation where both users are participants
    const conversations = await this.conversationModel
      .find({
        isGroup: false,
        'participants.userId': {
          $all: [new Types.ObjectId(userId1), new Types.ObjectId(userId2)],
        },
        'participants.hasLeft': false,
      })
      .exec();

    // Return the first conversation found, if any
    return conversations.length > 0 ? conversations[0] : null;
  }

  /**
   * Get all conversations for a user with pagination
   */
  async findAll(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<{ conversations: ConversationDocument[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    // Find conversations where the user is a participant and hasn't left
    const query = {
      'participants.userId': new Types.ObjectId(userId),
      'participants': {
        $elemMatch: {
          userId: new Types.ObjectId(userId),
          hasLeft: false,
        },
      },
    };

    // Count total matching conversations
    const total = await this.conversationModel.countDocuments(query);

    // Get conversations with pagination, sorted by last message time
    const conversations = await this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants.userId', 'name avatar')
      .populate('lastMessageSender', 'name')
      .exec();

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  /**
   * Update conversation details (e.g., title)
   */
  async update(
    conversationId: string,
    userId: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId, userId);

    // Only allow updating group conversations
    if (!conversation.isGroup) {
      throw new BadRequestException('Cannot update a direct message conversation');
    }

    // Check if user is the creator of the conversation
    if (conversation.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only the conversation creator can update the conversation');
    }

    // Update the conversation
    Object.assign(conversation, updateConversationDto);
    return conversation.save();
  }

  /**
   * Add participants to a group conversation
   */
  async addParticipants(
    conversationId: string,
    userId: string,
    addParticipantsDto: AddParticipantsDto,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId, userId);

    // Only allow adding participants to group conversations
    if (!conversation.isGroup) {
      throw new BadRequestException('Cannot add participants to a direct message conversation');
    }

    // Validate the users to add
    const validUserIds = await this.validateUsers(addParticipantsDto.participantIds);

    // Get current participant IDs
    const currentParticipantIds = conversation.participants.map(
      (p) => p.userId.toString()
    );

    // Filter out users who are already participants
    const newParticipantIds = validUserIds.filter(
      (id) => !currentParticipantIds.includes(id)
    );

    if (newParticipantIds.length === 0) {
      throw new BadRequestException('All specified users are already participants');
    }

    // Add new participants
    const newParticipants = newParticipantIds.map((id) => ({
      userId: new Types.ObjectId(id),
      unreadCount: conversation.lastMessage ? 1 : 0, // Set unread count to 1 if there's a last message
      hasLeft: false,
      joinedAt: new Date(),
    }));

    conversation.participants.push(...newParticipants);
    return conversation.save();
  }

  /**
   * Remove a participant from a group conversation
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
    participantId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId, userId);

    // Only allow removing participants from group conversations
    if (!conversation.isGroup) {
      throw new BadRequestException('Cannot remove participants from a direct message conversation');
    }

    // Check if user is the creator of the conversation or removing themselves
    if (conversation.createdBy.toString() !== userId && userId !== participantId) {
      throw new ForbiddenException('Only the conversation creator can remove other participants');
    }

    // Check if participant exists in the conversation
    const participantIndex = conversation.participants.findIndex(
      (p) => p.userId.toString() === participantId
    );

    if (participantIndex === -1) {
      throw new NotFoundException('Participant not found in the conversation');
    }

    // If removing the creator and other participants exist, assign a new creator
    if (participantId === conversation.createdBy.toString() && conversation.participants.length > 1) {
      // Find another participant who hasn't left
      const newCreator = conversation.participants.find(
        (p) => p.userId.toString() !== participantId && !p.hasLeft
      );

      if (newCreator) {
        conversation.createdBy = newCreator.userId;
      }
    }

    // If removing the last participant, delete the conversation
    const activeParticipants = conversation.participants.filter(
      (p) => !p.hasLeft && p.userId.toString() !== participantId
    );

    if (activeParticipants.length === 0) {
      await this.conversationModel.findByIdAndDelete(conversationId);
      return null;
    }

    // Mark the participant as having left
    conversation.participants[participantIndex].hasLeft = true;
    return conversation.save();
  }

  /**
   * Mark a conversation as read for a user
   */
  async markAsRead(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId, userId);

    // Find the participant in the conversation
    const participantIndex = conversation.participants.findIndex(
      (p) => p.userId.toString() === userId
    );

    if (participantIndex === -1) {
      throw new NotFoundException('User is not a participant in the conversation');
    }

    // Update the unread count and last read timestamp
    conversation.participants[participantIndex].unreadCount = 0;
    conversation.participants[participantIndex].lastReadAt = new Date();

    return conversation.save();
  }

  /**
   * Update conversation with a new message
   */
  async updateWithNewMessage(
    conversationId: string,
    messageId: string,
    senderId: string,
    messageText: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Update last message info
    conversation.lastMessage = new Types.ObjectId(messageId);
    conversation.lastMessageText = messageText.substring(0, 100); // Store a preview
    conversation.lastMessageSender = new Types.ObjectId(senderId);
    conversation.lastMessageAt = new Date();

    // Increment unread count for all participants except the sender
    conversation.participants.forEach((participant) => {
      if (participant.userId.toString() !== senderId && !participant.hasLeft) {
        participant.unreadCount += 1;
      }
    });

    return conversation.save();
  }

  /**
   * Validate that all user IDs exist in the database
   * @returns Array of validated user IDs
   */
  private async validateUsers(userIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(userIds)]; // Remove duplicates
    
    // Check if all users exist
    const validUsers = await this.userService.findByIds(uniqueIds);
    
    if (validUsers.length !== uniqueIds.length) {
      throw new BadRequestException('One or more specified users do not exist');
    }
    
    return uniqueIds;
  }

  /**
   * Validate that a user is a participant in a conversation
   */
  private validateParticipation(conversation: ConversationDocument, userId: string): void {
    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === userId && !p.hasLeft
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
  }
}
