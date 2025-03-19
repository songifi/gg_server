import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReputationLevel } from '../enums/reputation-level.enum';

@Schema()
class ReputationMetricsSchema {
  @Prop({ default: 0 })
  messageActivity: number;

  @Prop({ default: 0 })
  tokenTransfers: number;

  @Prop({ default: 0 })
  challengeCompletion: number;

  @Prop({ default: 0 })
  peerRatings: number;

  @Prop({ default: 0 })
  accountAge: number;

  @Prop({ default: 0 })
  contentQuality: number;

  @Prop({ default: 0 })
  achievementPoints: number;
}

@Schema({ timestamps: true })
export class ReputationDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, enum: ReputationLevel, default: ReputationLevel.NEWCOMER })
  level: ReputationLevel;

  @Prop({ type: ReputationMetricsSchema, default: () => ({}) })
  metrics: ReputationMetricsSchema;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const ReputationSchema = SchemaFactory.createForClass(ReputationDocument);
