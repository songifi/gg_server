
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { MessageStatus } from "../enums/message-status.enum";
import { MessageType } from "../enums/message-type.enum";

@Schema()
class ReactionSchema {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  emoji!: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

@Schema()
class DimensionsSchema {
  @Prop()
  width!: number;

  @Prop()
  height!: number;
}

@Schema()
class AttachmentSchema {
  @Prop({ required: true, enum: ["image", "video", "audio", "file"] })
  type!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop()
  dimensions?: DimensionsSchema;

  @Prop()
  duration?: number;

  @Prop()
  thumbnailUrl?: string;
}

@Schema()
class TokenTransferSchema {
  @Prop({ required: true })
  amount!: string;

  @Prop({ required: true })
  tokenAddress!: string;

  @Prop({ required: true })
  tokenSymbol!: string;

  @Prop({ required: true })
  tokenDecimals!: number;

  @Prop()
  transactionHash?: string;

  @Prop({ required: true, enum: ["pending", "confirmed", "failed"] })
  status!: string;
}

@Schema({ timestamps: true })
export class MessageDocument extends Document {
  @Prop({ required: true, index: true })
  conversationId!: string;

  @Prop({ required: true, index: true })
  sender!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Prop({ required: true, enum: MessageStatus, default: MessageStatus.SENT })
  status!: MessageStatus;

  @Prop({ type: [String], default: [] })
  readBy!: string[];

  @Prop({ type: [ReactionSchema], default: [] })
  reactions!: ReactionSchema[];

  @Prop()
  replyTo?: string;

  @Prop({ type: [String], default: [] })
  mentions?: string[];

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments?: AttachmentSchema[];

  @Prop({ type: TokenTransferSchema })
  tokenTransfer?: TokenTransferSchema;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isEdited!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
 
  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(MessageDocument);

// Create indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ "tokenTransfer.transactionHash": 1 }, { sparse: true });
MessageSchema.index({ mentions: 1 }, { sparse: true });

/**
 * Message Relationships Documentation
 *
 * The Message resource has the following relationships:
 *
 * 1. Message to User (Sender):
 *    - Each message has a sender field containing the user ID of the sender
 *    - This is a many-to-one relationship (many messages can be sent by one user)
 *    - The sender field is indexed for efficient querying
 *
 * 2. Message to Conversation:
 *    - Each message belongs to a conversation identified by conversationId
 *    - This is a many-to-one relationship (many messages in one conversation)
 *    - The conversationId field is indexed for efficient querying
 *    - Conversations can be either direct (between two users) or group (multiple users)
 *
 * 3. Message to Message (Reply):
 *    - Messages can reference other messages through the replyTo field
 *    - This creates a self-referential relationship for threaded conversations
 *
 * 4. Message to User (Mentions):
 *    - Messages can mention multiple users through the mentions array
 *    - This is a many-to-many relationship (messages can mention multiple users)
 *    - The mentions field is indexed for efficient notification queries
 *
 * 5. Message to User (Read Status):
 *    - The readBy array tracks which users have read the message
 *    - This is a many-to-many relationship (messages can be read by multiple users)
 *
 * 6. Message to Reaction:
 *    - Messages can have multiple reactions from different users
 *    - Reactions are embedded documents containing userId, emoji, and timestamp
 *
 * 7. Message to Token Transfer:
 *    - Messages can include token transfer details for StarkNet transactions
 *    - This embeds transaction data directly in the message for integrated display
 */
