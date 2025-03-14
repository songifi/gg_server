// src/modules/user/interfaces/user.interface.ts

import { Document } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export interface User extends Document {
  username: string;
  email: string;
  passwordHash: string;
  walletAddresses: string[];
  primaryWalletAddress?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  status: UserStatus;
  role: UserRole;
  lastSeen: Date;
  isEmailVerified: boolean;
  settings: UserSettings;
  contacts: string[]; // Array of user IDs
  blockedUsers: string[]; // Array of user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  theme: string;
  language: string;
}

export interface NotificationSettings {
  newMessage: boolean;
  newContact: boolean;
  tokenTransfer: boolean;
  groupInvite: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'contacts' | 'private';
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  walletAddressVisibility: 'public' | 'contacts' | 'private';
}
