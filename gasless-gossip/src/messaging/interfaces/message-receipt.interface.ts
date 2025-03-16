import { MessageStatus } from "../enums/message-status.enum";

export interface MessageReceipt {
    messageId: string; // ID of the message
    userId: string; // User ID this receipt is for
    status: MessageStatus; // Current status for this user
    deliveredAt?: Date; // When the message was delivered to this user
    readAt?: Date; // When the message was read by this user
  }
  