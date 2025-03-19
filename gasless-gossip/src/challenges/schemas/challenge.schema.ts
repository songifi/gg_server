// src/modules/challenges/schemas/challenge.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ChallengeType } from '../enums/challenge-type.enum';
import { ChallengeStatus } from '../enums/challenge-status.enum';
import { RewardType } from '../enums/reward-type.enum';

@Schema()
class ChallengeCriteriaSchema {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  target: number;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema()
class ChallengeRewardSchema {
  @Prop({ required: true, enum: RewardType })
  type: RewardType;

  @Prop()
  amount?: string;

  @Prop()
  tokenAddress?: string;

  @Prop()
  badgeId?: string;

  @Prop()
  roleId?: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class ChallengeDocument extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ChallengeType })
  type: ChallengeType;

  @Prop({ required: true, enum: ChallengeStatus, default: ChallengeStatus.DRAFT })
  status: ChallengeStatus;

  @Prop({ type: ChallengeCriteriaSchema, required: true })
  criteria: ChallengeCriteriaSchema;

  @Prop({ type: [ChallengeRewardSchema], default: [] })
  rewards: ChallengeRewardSchema[];

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  maxParticipants?: number;

  @Prop({ default: 0 })
  participantCount: number;

  @Prop({ default: 0 })
  completionCount: number;

  @Prop({ required: true })
  createdBy: string;
}

export const ChallengeSchema = SchemaFactory.createForClass(ChallengeDocument);

// Create indexes for efficient queries
ChallengeSchema.index({ status: 1, startDate: 1, endDate: 1 });
ChallengeSchema.index({ participantCount: -1 });
ChallengeSchema.index({ completionCount: -1 });
