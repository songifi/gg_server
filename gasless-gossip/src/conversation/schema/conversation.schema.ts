// File: src/modules/conversation/schemas/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group'
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

@Schema({ _id: false })
export class ConversationMember {
  @ApiProperty({ description: 'User ID of the participant' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Member role in the group' })
  @Prop({ type: String, enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @ApiProperty({ description: 'Number of unread messages for this participant' })
  @Prop({ type: Number, default: 0 })
  unreadCount: number;

  @ApiProperty({ description: 'Timestamp of last read message' })
  @Prop({ type: Date })
  lastReadAt?: Date;

  @ApiProperty({ description: 'Whether the member has left the conversation' })
  @Prop({ type: Boolean, default: false })
  hasLeft: boolean;

  @ApiProperty({ description: 'When the member joined the conversation' })
  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @ApiProperty({ description: 'When the member left the conversation' })
  @Prop({ type: Date })
  leftAt?: Date;
}

export const ConversationMemberSchema = SchemaFactory.createForClass(ConversationMember);

@Schema({ timestamps: true })
export class Conversation {
  @ApiProperty({ description: 'Conversation title (required for group conversations)' })
  @Prop({ type: String, trim: true })
  title?: string;

  @ApiProperty({ description: 'Conversation type' })
  @Prop({ type: String, enum: ConversationType, required: true })
  type: ConversationType;

  @ApiProperty({ description: 'Whether this is an encrypted conversation' })
  @Prop({ type: Boolean, default: false })
  isEncrypted: boolean;

  @ApiProperty({ description: 'Conversation description (for groups)' })
  @Prop({ type: String })
  description?: string;

  @ApiProperty({ description: 'Group avatar URL (for groups)' })
  @Prop({ type: String })
  avatarUrl?: string;

  @ApiProperty({ description: 'Conversation participants with their status' })
  @Prop({ type: [ConversationMemberSchema], required: true })
  members: ConversationMember[];

  @ApiProperty({ description: 'Creator of the conversation' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Last message in the conversation' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessageId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Last message timestamp' })
  @Prop({ type: Date })
  lastMessageAt?: Date;

  @ApiProperty({ description: 'Pinned messages in the conversation' })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Message' }], default: [] })
  pinnedMessages: MongooseSchema.Types.ObjectId[];

  @ApiProperty({ description: 'Whether members can add others (for groups)' })
  @Prop({ type: Boolean, default: true })
  canMembersAddMembers: boolean;

  @ApiProperty({ description: 'Whether members can send messages (for groups)' })
  @Prop({ type: Boolean, default: true })
  canMembersSendMessages: boolean;

  @ApiProperty({ description: 'Whether only admins can send messages (for announcements)' })
  @Prop({ type: Boolean, default: false })
  isAnnouncementGroup: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Create indexes for efficient querying
ConversationSchema.index({ 'members.userId': 1 });
ConversationSchema.index({ createdBy: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ 'members.userId': 1, lastMessageAt: -1 });
ConversationSchema.index({ 'members.userId': 1, 'members.hasLeft': 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ isAnnouncementGroup: 1 });