// src/modules/achievements/schemas/achievement.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AchievementType } from '../enums/achievement-type.enum';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementRarity } from '../enums/achievement-rarity.enum';

@Schema()
class AchievementCriteriaSchema {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  target: number;

  @Prop({ type: Object })
  conditions?: Record<string, any>;

  @Prop({ required: true, default: true })
  progressTrackable: boolean;
}

@Schema({ timestamps: true })
export class AchievementDocument extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: AchievementType })
  type: AchievementType;

  @Prop({ required: true, enum: AchievementCategory })
  category: AchievementCategory;

  @Prop({ required: true, enum: AchievementRarity })
  rarity: AchievementRarity;

  @Prop({ required: true, min: 1, max: 1000 })
  points: number;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Badge' })
  badgeId: string;

  @Prop({ default: false })
  isSecret: boolean;

  @Prop({ type: AchievementCriteriaSchema, required: true })
  criteria: AchievementCriteriaSchema;
}

export const AchievementSchema = SchemaFactory.createForClass(AchievementDocument);

// Create indexes for efficient queries
AchievementSchema.index({ category: 1 });
AchievementSchema.index({ rarity: 1 });
AchievementSchema.index({ 'criteria.type': 1 });
