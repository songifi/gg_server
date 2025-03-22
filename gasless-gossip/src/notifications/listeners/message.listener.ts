// File: src/modules/notifications/listeners/message.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { ConversationService } from '../../conversation/services/conversation.service';

@Injectable()
export class MessageNotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly conversationService: ConversationService, // Inject conversation service to get details
  ) {}

  /**
   * Listen for message created events
   */
  @OnEvent('message.created')
  async handleMessageCreated(payload: any): Promise<void> {
    try {
      const { 
        message, 
        conversation,
        mentionedUserIds = [] 
      } = payload;
      
      // Get conversation participants
      const participants = await this.conversationService.getParticipants(conversation._id);
      
      // Send notifications to all participants except sender
      for (const participant of participants) {
        const recipientId = participant._id.toString();
        
        // Skip the sender
        if (recipientId === message.senderId.toString()) {
          continue;
        }
        
        // Create new message notification
        await this.notificationService.createNewMessageNotification(
          recipientId,
          message.senderId.toString(),
          message._id.toString(),
          conversation._id.toString(),
          message.content.substring(0, 100), // Preview
          message.sender.name,
          conversation.isGroup,
          conversation.title
        );
      }
      
      // Create mention notifications
      for (const mentionedUserId of mentionedUserIds) {
        // Skip if user is the sender
        if (mentionedUserId === message.senderId.toString()) {
          continue;
        }
        
        await this.notificationService.createMentionNotification(
          mentionedUserId,
          message.senderId.toString(),
          message._id.toString(),
          conversation._id.toString(),
          message.content.substring(0, 100), // Preview
          message.sender.name
        );
      }
    } catch (error) {
      console.error('Error creating message notifications:', error);
    }
  }
}