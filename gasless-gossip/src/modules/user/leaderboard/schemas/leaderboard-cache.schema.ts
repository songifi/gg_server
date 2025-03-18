import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LeaderboardCategory } from '../enums/leaderboard-category.enum';
import { TimePeriod } from '../enums/time-period.enum';

@Schema()
class LeaderboardEntryCacheSchema {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  displayName: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  rank: number;
}

@Schema()
export class LeaderboardCacheDocument extends Document {
  @Prop({ required: true, enum: LeaderboardCategory })
  category: LeaderboardCategory;

  @Prop({ required: true, enum: TimePeriod })
  period: TimePeriod;

  @Prop({ required: true, type: Date })
  createdAt: Date;

  @Prop({ required: true, type: Date })
  expiresAt: Date;

  @Prop({ type: [LeaderboardEntryCacheSchema] })
  entries: LeaderboardEntryCacheSchema[];
}

export const LeaderboardCacheSchema = SchemaFactory.createForClass(LeaderboardCacheDocument);

// Create compound index for cache lookup
LeaderboardCacheSchema.index({ category: 1, period: 1 }, { unique: true });
