import { Document } from 'mongoose';
import { ReactionType } from '../enums/reaction-type.enum';

export interface MessageReaction extends Document {
  messageId: string;       // ID of the message being reacted to
  userId: string;          // User who created the reaction
  conversationId: string;  // ID of the conversation containing the message
  type: ReactionType;      // Type of reaction (emoji or custom)
  content: string;         // The reaction content (emoji code or custom identifier)
  createdAt: Date;         // When the reaction was created
  updatedAt: Date;         // When the reaction was last updated
}