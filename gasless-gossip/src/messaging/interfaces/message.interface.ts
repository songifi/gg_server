import { Document } from "mongoose";
import { MessageStatus } from "../enums/message-status.enum";
import { MessageType } from "../enums/message-type.enum";
import { Reaction } from "./reaction.interface";
import { TokenTransfer } from "./token-transfer.interface";
import { Attachment } from "./attachment.interface";


export interface Message extends Document {
  conversationId: string; // Reference to the conversation
  sender: string; // User ID of the sender
  content: string; // Message content
  type: MessageType; // Type of message
  status: MessageStatus; // Delivery status
  readBy: string[]; // Array of user IDs who have read the message
  reactions: Reaction[]; // Array of reactions to this message
  replyTo?: string; // ID of message being replied to (optional)
  mentions?: string[]; // Array of user IDs mentioned in the message
  attachments?: Attachment[]; // Array of attachments (optional)
  tokenTransfer?: TokenTransfer; // Token transfer details (optional)
  metadata?: any; // Additional metadata
  isEdited: boolean; // Whether the message has been edited
  isDeleted: boolean; // Soft delete flag
  deliveredAt?: Date; // When the message was delivered
  readAt?: Date; // When the message was read
  createdAt: Date; // When the message was created
  updatedAt: Date; // When the message was last updated
}
