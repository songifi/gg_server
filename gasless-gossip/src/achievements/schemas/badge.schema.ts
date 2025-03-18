// src/modules/achievements/schemas/badge.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BadgeDocument extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: false, type: MongooseSchema.Types.ObjectId, ref: 'Achievement' })
  achievementId?: string;
}

export const BadgeSchema = SchemaFactory.createForClass(BadgeDocument);

