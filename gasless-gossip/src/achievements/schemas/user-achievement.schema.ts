// src/modules/achievements/schemas/user-achievement.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class UserAchievementDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId, ref: 'Achievement' })
  achievementId: string;

  @Prop({ required: true, default: 0 })
  progress: number;

  @Prop({ required: true })
  target: number;

  @Prop({ required: true, default: 0 })
  percentComplete: number;

  @Prop({ required: true, default: false })
  isCompleted: boolean;

  @Prop()
  completedAt?: Date;
}

export const UserAchievementSchema = SchemaFactory.createForClass(UserAchievementDocument);

// Create compound index for user-achievement uniqueness
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
