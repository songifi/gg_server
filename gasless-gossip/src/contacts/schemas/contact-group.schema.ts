up.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ContactGroupDocument extends Document {
  @Prop({ type: String, required: true, index: true })
  owner: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  color?: string;
}

export const ContactGroupSchema = SchemaFactory.createForClass(ContactGroupDocument);

// Create compound index for owner+name to ensure uniqueness
ContactGroupSchema.index({ owner: 1, name: 1 }, { unique: true });