import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TransactionStatsDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  totalValue: number;

  @Prop({ required: true, default: 0 })
  transactionCount: number;

  @Prop({ required: true, default: 0 })
  averageValue: number;

  @Prop({ required: true, default: 0 })
  recipientCount: number;

  @Prop({ required: true, default: 0 })
  tokenCount: number;

  @Prop({ required: true, default: 0 })
  streak: number;

  @Prop({ required: true, default: 0 })
  longestStreak: number;

  @Prop({ type: Date })
  lastTransactionDate: Date;

  @Prop({ type: Date })
  firstTransactionDate: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const TransactionStatsSchema = SchemaFactory.createForClass(TransactionStatsDocument);
