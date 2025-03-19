import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ReactionType } from '../enums/reaction-type.enum';

@Schema({ timestamps: true })
export class MessageReactionDocument extends Document {
  @Prop({ required: true, index: true })
  messageId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, enum: ReactionType })
  type: ReactionType;

  @Prop({ required: true })
  content: string;
}

export const MessageReactionSchema = SchemaFactory.createForClass(MessageReactionDocument);

// Create compound index for efficient queries and to ensure uniqueness
MessageReactionSchema.index({ messageId: 1, userId: 1, content: 1 }, { unique: true });
// Index for retrieving all reactions for a message
MessageReactionSchema.index({ messageId: 1, content: 1 });
// Index for retrieving user's reactions
MessageReactionSchema.index({ userId: 1 });