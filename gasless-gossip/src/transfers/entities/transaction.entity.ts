// File: src/modules/transfers/entities/transaction.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { TokenType } from '../interfaces/token-type.enum';
import { TransactionStatus } from '../interfaces/transaction-status.interface';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  senderId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recipientId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  messageId?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Conversation' })
  conversationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: TokenType })
  tokenType: TokenType;

  @Prop({ type: String })
  tokenAddress?: string;

  @Prop({ type: String })
  tokenId?: string;

  @Prop({ required: true, type: String })
  amount: string;

  @Prop({ required: true, unique: true, sparse: true, type: String })
  txHash: string;

  @Prop({ required: true, enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Prop({ type: Date })
  statusUpdatedAt: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number })
  blockNumber?: number;

  @Prop({ type: String })
  blockHash?: string;

  @Prop({ type: Object })
  receipt?: Record<string, any>;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Create indexes
TransactionSchema.index({ senderId: 1 });
TransactionSchema.index({ recipientId: 1 });
TransactionSchema.index({ conversationId: 1 });
TransactionSchema.index({ txHash: 1 }, { unique: true });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });