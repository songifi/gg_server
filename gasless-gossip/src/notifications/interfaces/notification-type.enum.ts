// File: src/modules/notifications/interfaces/notification-type.enum.ts
export enum NotificationType {
    // Message-related notifications
    NEW_MESSAGE = 'NEW_MESSAGE',
    MESSAGE_MENTION = 'MESSAGE_MENTION',
    CONVERSATION_INVITE = 'CONVERSATION_INVITE',
    
    // Transfer-related notifications
    TRANSFER_RECEIVED = 'TRANSFER_RECEIVED',
    TRANSFER_SENT = 'TRANSFER_SENT',
    TRANSFER_COMPLETED = 'TRANSFER_COMPLETED',
    TRANSFER_FAILED = 'TRANSFER_FAILED',
    
    // System notifications
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    SYSTEM_UPDATE = 'SYSTEM_UPDATE',
    SECURITY_ALERT = 'SECURITY_ALERT',
    
    // Social notifications
    FRIEND_REQUEST = 'FRIEND_REQUEST',
    FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
    USER_FOLLOWED = 'USER_FOLLOWED'
  }