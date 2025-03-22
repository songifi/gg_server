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
  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    required: true,
  })
  type!: ConversationType;

  @Prop({
    type: String,
    required: function (this: ConversationDocument) {
      return this.type === ConversationType.GROUP;
    },
    trim: true,
    maxlength: 100,
  })
  title?: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    validate: [
      {
        validator: function (this: ConversationDocument, participants: string[]) {
          if (this.type === ConversationType.DIRECT) {
            return participants.length === 2;
          }
          return participants.length >= 2;
        },
        message:
          'Direct conversations must have exactly 2 participants, group conversations must have at least 2',
      },
    ],
    required: true,
  })
  participants!: User[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: function (this: ConversationDocument) {
      return this.type === ConversationType.GROUP;
    },
  })
  admin?: User;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: Date.now })
  lastMessageAt!: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Add indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ admin: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
