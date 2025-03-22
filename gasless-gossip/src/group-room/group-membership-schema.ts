// src/group/schemas/group-membership.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Group } from './group.schema';

export type GroupMembershipDocument = GroupMembership & Document;

export enum GroupRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

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
export class GroupMembership {
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User',
    required: true 
  })
  user: User;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Group',
    required: true 
  })
  group: Group;

  @Prop({
    type: String,
    enum: Object.values(GroupRole),
    default: GroupRole.MEMBER
  })
  role: GroupRole;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: true })
  notifications: boolean;

  @Prop({ default: false })
  isMuted: boolean;

  @Prop()
  lastReadMessageAt: Date;
}

export const GroupMembershipSchema = SchemaFactory.createForClass(GroupMembership);

// Adding compound index to ensure a user can only be a member of a group once
GroupMembershipSchema.index({ user: 1, group: 1 }, { unique: true });

// Adding indexes for efficient queries
GroupMembershipSchema.index({ group: 1 }); // Find all members of a group
GroupMembershipSchema.index({ user: 1 }); // Find all groups a user is a member of
GroupMembershipSchema.index({ group: 1, role: 1 }); // Find all admins/moderators of a group
