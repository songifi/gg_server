// File: src/modules/notifications/listeners/conversation.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class ConversationNotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService, // Inject user service to get user details
  ) {}

  /**
   * Listen for participant added events
   */
  @OnEvent('conversation.participant.added')
  async handleParticipantAdded(payload: any): Promise<void> {
    try {
      const { 
        conversationId, 
        addedByUserId, 
        addedParticipantIds,
        conversationTitle,
        isGroupConversation
      } = payload;
      
      // Get user who added the participants
      const adder = await this.userService.findById(addedByUserId);
      
      // Create notification for each added participant
      for (const participantId of addedParticipantIds) {
        await this.notificationService.createConversationInviteNotification(
          participantId,
          addedByUserId,
          conversationId,
          adder.name,
          conversationTitle,
          isGroupConversation
        );
      }
    } catch (error) {
      console.error('Error creating conversation invite notification:', error);
    }
  }
}