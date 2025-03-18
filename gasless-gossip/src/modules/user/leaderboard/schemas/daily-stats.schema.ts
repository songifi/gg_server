import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DailyStatsDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ required: true, default: 0 })
  totalValue: number;

  @Prop({ required: true, default: 0 })
  transactionCount: number;

  @Prop({ required: true, default: 0 })
  recipientCount: number;

  @Prop({ required: true, default: 0 })
  tokenCount: number;
}

export const DailyStatsSchema = SchemaFactory.createForClass(DailyStatsDocument);

// Create compound index for efficient date-based queries
DailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });