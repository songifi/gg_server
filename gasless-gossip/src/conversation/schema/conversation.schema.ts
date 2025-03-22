import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

// Subdocument schema for participant information
@Schema({ _id: false })
export class Participant {
  @ApiProperty({ description: 'User ID of the participant' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Number of unread messages for this participant' })
  @Prop({ type: Number, default: 0 })
  unreadCount: number;

  @ApiProperty({ description: 'Timestamp when the participant last read the conversation' })
  @Prop({ type: Date })
  lastReadAt?: Date;

  @ApiProperty({ description: 'Whether the participant has left the conversation' })
  @Prop({ type: Boolean, default: false })
  hasLeft: boolean;

  @ApiProperty({ description: 'When the participant was added to the conversation' })
  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ timestamps: true })
export class Conversation {
  @ApiProperty({ description: 'Conversation title (optional for direct messages)' })
  @Prop({ type: String, trim: true })
  title?: string;

  @ApiProperty({ description: 'Whether this is a group conversation' })
  @Prop({ type: Boolean, default: false, required: true })
  isGroup: boolean;

  @ApiProperty({ description: 'Conversation participants with their read status' })
  @Prop({ type: [ParticipantSchema], required: true })
  participants: Participant[];

  @ApiProperty({ description: 'Creator of the conversation' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Last message in the conversation' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessage?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Last message text preview' })
  @Prop({ type: String })
  lastMessageText?: string;

  @ApiProperty({ description: 'Sender of the last message' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  lastMessageSender?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'When the last message was sent' })
  @Prop({ type: Date })
  lastMessageAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Create indexes for efficient querying
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, 'participants.hasLeft': 1 });
