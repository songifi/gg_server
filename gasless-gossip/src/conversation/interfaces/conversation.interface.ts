import { ConversationType } from '../enums/conversation.enum';

// Base Conversation Interface
export interface IConversation {
  _id: string;
  type: ConversationType;
  title?: string;
  participants: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  isActive: boolean;
}

// Direct Conversation Interface
export interface IDirectConversation extends IConversation {
  type: ConversationType.DIRECT;
  participants: [string, string]; // Exactly 2 participants
}

// Group Conversation Interface
export interface IGroupConversation extends IConversation {
  type: ConversationType.GROUP;
  title: string; // Required for group conversations
  participants: string[]; // 2 or more participants
  admin: string; // User ID of the group admin
}
