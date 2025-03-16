// src/modules/user/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import * as bcrypt from 'bcrypt';

@Schema({ timestamps: true })
export class UserDocument extends Document {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: [String], default: [] })
  walletAddresses!: string[];

  @Prop({ type: String })
  primaryWalletAddress?: string;

  @Prop({ default: '' })
  displayName!: string;

  @Prop()
  bio?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Prop({ default: Date.now })
  lastSeen!: Date;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({
    type: {
      notifications: {
        newMessage: { type: Boolean, default: true },
        newContact: { type: Boolean, default: true },
        tokenTransfer: { type: Boolean, default: true },
        groupInvite: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
      },
      privacy: {
        profileVisibility: { type: String, default: 'public' },
        lastSeenVisibility: { type: String, default: 'everyone' },
        walletAddressVisibility: { type: String, default: 'public' },
      },
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' },
    },
    default: {
      notifications: {
        newMessage: true,
        newContact: true,
        tokenTransfer: true,
        groupInvite: true,
        emailNotifications: true,
        pushNotifications: true,
      },
      privacy: {
        profileVisibility: 'public',
        lastSeenVisibility: 'everyone',
        walletAddressVisibility: 'public',
      },
      theme: 'light',
      language: 'en',
    },
  })
  settings!: {
    notifications: {
      newMessage: boolean;
      newContact: boolean;
      tokenTransfer: boolean;
      groupInvite: boolean;
      emailNotifications: boolean;
      pushNotifications: boolean;
    };
    privacy: {
      profileVisibility: string;
      lastSeenVisibility: string;
      walletAddressVisibility: string;
    };
    theme: string;
    language: string;
  };

  @Prop({ type: [String], default: [] })
  contacts!: string[];

  @Prop({ type: [String], default: [] })
  blockedUsers!: string[];

  @Prop({
    default: 0,
  })
  failedLoginAttempts!: number;

  @Prop({
    type: [String],
    default: [],
    select: false,
  })
  refreshTokens!: string[];

  @Prop()
  lockUntil?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
export interface IUser extends UserDocument {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
}
// Add indexes for better query performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ walletAddresses: 1 });
UserSchema.index({ status: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash as string);
};
