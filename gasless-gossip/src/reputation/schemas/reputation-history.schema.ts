import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReputationFactor } from '../enums/reputation-factor.enum';
import { ReputationChangeType } from '../enums/reputation-change-type.enum';
import { ReputationLevel } from '../enums/reputation-level.enum';

@Schema({ timestamps: true })
export class ReputationHistoryDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ReputationFactor })
  factor: ReputationFactor;

  @Prop({ required: true, enum: ReputationChangeType })
  changeType: ReputationChangeType;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  oldScore: number;

  @Prop({ required: true })
  newScore: number;

  @Prop({ enum: ReputationLevel })
  oldLevel?: ReputationLevel;

  @Prop({ enum: ReputationLevel })
  newLevel?: ReputationLevel;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ReputationHistorySchema = SchemaFactory.createForClass(ReputationHistoryDocument);

// Create index for efficient queries
ReputationHistorySchema.index({ userId: 1, createdAt: -1 });
ReputationHistorySchema.index({ factor: 1 });
