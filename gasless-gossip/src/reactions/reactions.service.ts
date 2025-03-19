import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageReactionDocument } from './schemas/message-reaction.schema';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ReactionResponseDto } from './dto/reaction-response.dto';
import { ReactionSummaryDto } from './dto/reaction-summary.dto';
import { MessageReactionsResponseDto } from './dto/message-reactions-response.dto';
import { ReactionType } from './enums/reaction-type.enum';

@Injectable()
export class ReactionsService {
  private readonly logger = new Logger(ReactionsService.name);
  private readonly allowedEmojis: string[] = [
    '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '👀', '🔥', 
    '💯', '✅', '❌', '⭐', '🙏', '👋', '💪', '🤔', '👏', '🚀'
  ];

  constructor(
    @InjectModel('MessageReaction')
    private reactionModel: Model<MessageReactionDocument>,
    private readonly eventEmitter: EventEmitter2,
    // Inject message and conversation services for checks
    // private readonly messageService: MessageService,
    // private readonly conversationService: ConversationService,
    // private readonly userService: UserService,
  ) {}

  /**
   * Add a reaction to a message
   */
  async addReaction(
    userId: string,
    createReactionDto: CreateReactionDto,
  ): Promise<ReactionResponseDto> {
    try {
      const { messageId, type, content } = createReactionDto;
      
      // Validate the reaction content
      await this.validateReactionContent(type, content);
      
      // Verify message exists and user has permission to react
      // In a real implementation, we would check these
      // const message = await this.messageService.findById(messageId);
      // if (!message) {
      //   throw new NotFoundException(`Message with ID ${messageId} not found`);
      // }
      const message = { id: messageId, conversationId: 'test-conversation' };
      const conversationId = message.conversationId;
      
      // Check if user can access the conversation containing this message
      // await this.conversationService.verifyUserAccess(userId, conversationId);
      
      // Check if reaction already exists
      const existingReaction = await this.reactionModel.findOne({
        messageId,
        userId,
        content,
      }).exec();
      
      if (existingReaction) {
        // If the same reaction already exists, do nothing (idempotent)
        return new ReactionResponseDto(existingReaction.toObject());
      }
      
      // Create new reaction
      const reaction = new this.reactionModel({
        messageId,
        userId,
        conversationId,
        type,
        content,
      });
      
      const savedReaction = await reaction.save();
      
      // Emit event for real-time updates
      this.eventEmitter.emit('reaction.added', {
        reactionId: savedReaction._id,
        messageId,
        userId,
        conversationId,
        type,
        content,
      });
      
      return new ReactionResponseDto(savedReaction.toObject());
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    userId: string,
    removeReactionDto: RemoveReactionDto,
  ): Promise<void> {
    try {
      const { messageId, content, userId: targetUserId } = removeReactionDto;
      
      // If targetUserId is provided, verify the requester has admin permissions
      if (targetUserId && targetUserId !== userId) {
        // In a real implementation, check admin permissions
        // await this.verifyAdminPermissions(userId, messageId);
      }
      
      // Find reaction to remove
      const reactionQuery = {
        messageId,
        content,
        userId: targetUserId || userId,
      };
      
      const reaction = await this.reactionModel.findOne(reactionQuery).exec();
      
      if (!reaction) {
        throw new NotFoundException('Reaction not found');
      }
      
      // Get conversation ID before deleting
      const conversationId = reaction.conversationId;
      
      // Remove the reaction
      await this.reactionModel.deleteOne({ _id: reaction._id }).exec();
      
      // Emit event for real-time updates
      this.eventEmitter.emit('reaction.removed', {
        messageId,
        userId: reaction.userId,
        conversationId,
        content,
      });
    } catch (error) {
      this.logger.error(`Error removing reaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate reaction content based on type
   */
  private async validateReactionContent(
    type: ReactionType,
    content: string,
  ): Promise<void> {
    if (type === ReactionType.EMOJI) {
      // For emoji reactions, verify it's in our allowed list
      if (!this.allowedEmojis.includes(content)) {
        throw new BadRequestException(`Emoji reaction "${content}" is not allowed`);
      }
    } else if (type === ReactionType.CUSTOM) {
      // For custom reactions, validate against custom reaction system
      // This would depend on your application's custom reaction system
      if (!content.match(/^[a-zA-Z0-9_-]{1,8}$/)) {
        throw new BadRequestException('Invalid custom reaction format');
      }
    }
  }

  /**
   * Get reactions for a specific message
   */
  async getMessageReactions(
    messageId: string,
    includeFull = false,
  ): Promise<MessageReactionsResponseDto> {
    try {
      // Get all reactions for the message
      const reactions = await this.reactionModel.find({ messageId }).exec();
      
      // Group reactions by content
      const groupedReactions = this.groupReactionsByContent(reactions);
      
      // Create the response
      const response = new MessageReactionsResponseDto({
        messageId,
        totalReactions: reactions.length,
        summary: groupedReactions,
      });
      
      // Include full reaction details if requested
      if (includeFull) {
        response.reactions = reactions.map(reaction => 
          new ReactionResponseDto(reaction.toObject())
        );
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Error getting message reactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Group reactions by content and count occurrences
   */
  private groupReactionsByContent(
    reactions: MessageReactionDocument[],
  ): ReactionSummaryDto[] {
    const groupedReactions = {};
    
    for (const reaction of reactions) {
      const content = reaction.content;
      
      if (!groupedReactions[content]) {
        groupedReactions[content] = {
          content,
          count: 0,
          userIds: [],
          users: [],
        };
      }
      
      groupedReactions[content].count += 1;
      groupedReactions[content].userIds.push(reaction.userId);
      
      // In a real implementation, we would fetch and include user details
      // const user = await this.userService.getUserById(reaction.userId);
      // if (user) {
      //   groupedReactions[content].users.push({
      //     username: user.username,
      //     displayName: user.displayName,
      //     avatarUrl: user.avatarUrl,
      //   });
      // }
    }
    
    // Convert to array and sort by count (descending)
    return Object.values(groupedReactions)
      .sort((a, b) => b.count - a.count)
      .map(group => new ReactionSummaryDto(group));
  }

  /**
   * Get user's reactions to a message
   */
  async getUserReactionsToMessage(
    userId: string,
    messageId: string,
  ): Promise<ReactionResponseDto[]> {
    try {
      const reactions = await this.reactionModel.find({ userId, messageId }).exec();
      
      return reactions.map(reaction => new ReactionResponseDto(reaction.toObject()));
    } catch (error) {
      this.logger.error(`Error getting user reactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all reactions by a user
   */
  async getUserReactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ reactions: ReactionResponseDto[], total: number, page: number, pages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [reactions, total] = await Promise.all([
        this.reactionModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.reactionModel.countDocuments({ userId }).exec(),
      ]);
      
      const pages = Math.ceil(total / limit);
      
      return {
        reactions: reactions.map(reaction => new ReactionResponseDto(reaction.toObject())),
        total,
        page,
        pages,
      };
    } catch (error) {
      this.logger.error(`Error getting user reactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove all reactions from a message
   * (Admin function or when deleting a message)
   */
  async removeAllReactionsFromMessage(
    messageId: string,
  ): Promise<void> {
    try {
      // Get conversation ID for event emission
      const reaction = await this.reactionModel.findOne({ messageId }).exec();
      const conversationId = reaction?.conversationId;
      
      // Delete all reactions for this message
      await this.reactionModel.deleteMany({ messageId }).exec();
      
      // Emit event if needed
      if (conversationId) {
        this.eventEmitter.emit('reaction.cleared', {
          messageId,
          conversationId,
        });
      }
    } catch (error) {
      this.logger.error(`Error removing all reactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if message has specific reaction from user
   */
  async hasReaction(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<boolean> {
    const reaction = await this.reactionModel.findOne({
      messageId,
      userId,
      content,
    }).exec();
    
    return !!reaction;
  }

  /**
   * Get allowed emoji reactions
   */
  getAllowedEmojis(): string[] {
    return this.allowedEmojis;
  }
}