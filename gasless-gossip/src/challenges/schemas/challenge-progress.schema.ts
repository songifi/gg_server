// src/modules/challenges/schemas/challenge-progress.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ProgressStatus } from '../enums/progress-status.enum';

@Schema({ timestamps: true })
export class ChallengeProgressDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId, ref: 'Challenge' })
  challengeId: string;

  @Prop({ required: true, enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  status: ProgressStatus;

  @Prop({ required: true, default: 0 })
  currentValue: number;

  @Prop({ required: true })
  targetValue: number;

  @Prop({ required: true, default: 0 })
  percentComplete: number;

  @Prop()
  completedAt?: Date;

  @Prop({ default: false })
  rewardClaimed: boolean;

  @Prop()
  rewardClaimedAt?: Date;

  @Prop({ default: Date.now })
  joinedAt: Date;
}

export const ChallengeProgressSchema = SchemaFactory.createForClass(ChallengeProgressDocument);

// Create compound index for user-challenge uniqueness
ChallengeProgressSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
// Create index for leaderboard queries
ChallengeProgressSchema.index({ challengeId: 1, currentValue: -1, completedAt: 1 });