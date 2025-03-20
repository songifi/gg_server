// src/modules/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({
    required: true,
    unique: true,
  })
  username: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    default: false,
  })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  emailVerificationTokenExpires: Date;

  @Prop({
    default: Date.now,
  })
  registeredAt: Date;

  @Prop()
  lastLoginAt: Date;

  @Prop({
    default: 'user',
    enum: ['user', 'admin'],
  })
  role: string;

  @Prop({
    type: Object,
    default: {},
  })
  profile: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    location?: string;
  };

  @Prop({
    type: Object,
    default: {},
  })
  settings: {
    emailNotifications: boolean;
    theme: string;
    privacy: {
      profileVisibility: string;
    };
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes for optimized queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
