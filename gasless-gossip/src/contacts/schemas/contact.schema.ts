import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ContactStatus } from '../enums/contact-status.enum';

@Schema({ timestamps: true })
export class ContactDocument extends Document {
  @Prop({ type: String, required: true, index: true })
  owner!: string;

  @Prop({ type: String, required: true, index: true })
  user!: string;

  @Prop({ type: String })
  nickname?: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: [String], default: [] })
  groups!: string[];

  @Prop({ type: String, enum: ContactStatus, default: ContactStatus.ACTIVE })
  status!: ContactStatus;

  @Prop({ type: Boolean, default: false })
  isFavorite!: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(ContactDocument);

// Create compound index for owner+user to ensure uniqueness
ContactSchema.index({ owner: 1, user: 1 }, { unique: true });
// Create index for efficient listing of contacts by group
ContactSchema.index({ owner: 1, groups: 1 });
// Create index for efficient listing of blocked contacts
ContactSchema.index({ owner: 1, status: 1 });