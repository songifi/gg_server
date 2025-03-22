// src/group/schemas/group.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export type GroupDocument = Group & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Group {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User',
    required: true 
  })
  createdBy: User;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: true })
  joinRequiresApproval: boolean;

  @Prop({ default: 50 })
  maxMembers: number;

  @Prop({ default: false })
  isEncrypted: boolean;

  @Prop()
  encryptionKey: string;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  // Virtual for member count
  memberCount: number;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

// Adding indexes for efficient queries
GroupSchema.index({ name: 'text', description: 'text' }); // Text search
GroupSchema.index({ isPublic: 1 }); // Query for public groups
GroupSchema.index({ createdBy: 1 }); // Query groups by creator
GroupSchema.index({ tags: 1 }); // Query groups by tags
GroupSchema.index({ lastActivityAt: -1 }); // Sort by activity
