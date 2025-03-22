// File: src/modules/messaging/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

@Schema({ _id: false })
export class ReadReceipt {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  readAt: Date;
}

export const ReadReceiptSchema = SchemaFactory.createForClass(ReadReceipt);

@Schema({ timestamps: true })
export class Message {
  @ApiProperty({ description: 'Message sender ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Recipient ID (for direct messages)' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recipientId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Group ID (for group messages)' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation' })
  groupId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Conversation this message belongs to' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: MongooseSchema.Types.ObjectId;
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Schema({ timestamps: true })
export class Message {
  @ApiProperty({ description: 'The sender user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  sender: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'The recipient user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  recipient: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'The conversation this message belongs to' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversation: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Message content' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ enum: MessageType, description: 'Type of message' })
  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @ApiProperty({ description: 'Whether this message is pinned' })
  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @ApiProperty({ description: 'Who pinned this message' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  pinnedBy?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'When this message was pinned' })
  @Prop({ type: Date })
  pinnedAt?: Date;

  @ApiProperty({ description: 'Array of read receipts' })
  @Prop({ type: [ReadReceiptSchema], default: [] })
  readReceipts: ReadReceipt[];

  @ApiProperty({ description: 'Array of user IDs who have been mentioned' })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  mentions: MongooseSchema.Types.ObjectId[];

  @ApiProperty({ description: 'Optional reply to another message' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  replyToId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Message delivery status' })
  @Prop({ type: String, enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @ApiProperty({ description: 'Additional metadata for specific message types' })
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'ID of transaction attached to this message (if any)' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction' })
  transactionId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Whether this message is edited' })
  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @ApiProperty({ description: 'When this message was edited' })
  @Prop({ type: Date })
  editedAt?: Date;

  @ApiProperty({ description: 'Whether this message is deleted' })
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'When this message was deleted' })
  @Prop({ type: Date })
  deletedAt?: Date;
  @ApiProperty({ enum: MessageStatus, description: 'Current status of the message' })
  @Prop({ type: String, enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @ApiProperty({ description: 'When the message was delivered' })
  @Prop()
  deliveredAt?: Date;

  @ApiProperty({ description: 'When the message was read' })
  @Prop()
  readAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type MessageDocument = Message & Document;
export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ recipientId: 1 });
MessageSchema.index({ groupId: 1 });
MessageSchema.index({ isPinned: 1, conversationId: 1 });
MessageSchema.index({ 'mentions': 1 });
MessageSchema.index({ type: 1, conversationId: 1 });
MessageSchema.index({ replyToId: 1 });
