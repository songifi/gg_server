// File: src/modules/notifications/services/notification.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../interfaces/notification-type.enum';
import { NotificationQueryDto } from '../dto/pagination.dto';
import { BatchUpdateNotificationsDto } from '../dto/batch-update.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new notification
   */
  async create(notificationData: Partial<Notification>): Promise<Notification> {
    try {
      const notification = new this.notificationModel(notificationData);
      const savedNotification = await notification.save();
      
      // Emit event for real-time delivery
      this.eventEmitter.emit('notification.created', savedNotification);
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user notifications with filtering and pagination
   */
  async getUserNotifications(
    userId: string,
    queryParams: NotificationQueryDto,
  ): Promise<{ 
    notifications: Notification[], 
    unreadCount: number,
    total: number, 
    page: number, 
    limit: number
  }> {
    try {
      const { page = 1, limit = 20, read, types } = queryParams;
      const skip = (page - 1) * limit;
      
      // Build query
      const query: any = { 
        recipientId: new Types.ObjectId(userId),
        deleted: false
      };
      
      // Add read filter if specified
      if (read !== undefined) {
        query.read = read;
      }
      
      // Add type filter if specified
      if (types && types.length > 0) {
        query.type = { $in: types };
      }
      
      // Count total matching notifications
      const total = await this.notificationModel.countDocuments(query);
      
      // Count total unread notifications (regardless of other filters)
      const unreadCount = await this.notificationModel.countDocuments({
        recipientId: new Types.ObjectId(userId),
        read: false,
        deleted: false
      });
      
      // Get notifications with pagination
      const notifications = await this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name avatar')
        .exec();
      
      return {
        notifications,
        unreadCount,
        total,
        page,
        limit
      };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await this.findByIdAndValidateOwner(notificationId, userId);
      
      // If already read, return as-is
      if (notification.read) {
        return notification;
      }
      
      // Update read status
      notification.read = true;
      notification.readAt = new Date();
      
      return notification.save();
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.notificationModel.updateMany(
        { 
          recipientId: new Types.ObjectId(userId),
          read: false,
          deleted: false
        },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          } 
        }
      );
      
      return {
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Batch update multiple notifications
   */
  async batchUpdate(
    userId: string,
    updateDto: BatchUpdateNotificationsDto,
  ): Promise<{ modifiedCount: number }> {
    try {
      // Ensure we have at least one update field
      if (updateDto.read === undefined && updateDto.deleted === undefined) {
        throw new BadRequestException('No update parameters provided');
      }
      
      // Prepare update object
      const updateObj: any = {};
      
      if (updateDto.read !== undefined) {
        updateObj.read = updateDto.read;
        if (updateDto.read) {
          updateObj.readAt = new Date();
        } else {
          updateObj.readAt = null;
        }
      }
      
      if (updateDto.deleted !== undefined) {
        updateObj.deleted = updateDto.deleted;
        if (updateDto.deleted) {
          updateObj.deletedAt = new Date();
        } else {
          updateObj.deletedAt = null;
        }
      }
      
      // Convert string IDs to ObjectIds
      const notificationObjectIds = updateDto.notificationIds.map(
        id => new Types.ObjectId(id)
      );
      
      // Update the notifications
      const result = await this.notificationModel.updateMany(
        { 
          _id: { $in: notificationObjectIds },
          recipientId: new Types.ObjectId(userId)
        },
        { $set: updateObj }
      );
      
      return {
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to batch update notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a notification (soft delete)
   */
  async delete(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await this.findByIdAndValidateOwner(notificationId, userId);
      
      // If already deleted, return as-is
      if (notification.deleted) {
        return notification;
      }
      
      // Update deleted status
      notification.deleted = true;
      notification.deletedAt = new Date();
      
      return notification.save();
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get notification by ID and validate ownership
   */
  private async findByIdAndValidateOwner(
    notificationId: string, 
    userId: string
  ): Promise<Notification> {
    const notification = await this.notificationModel.findById(notificationId);
    
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    
    if (notification.recipientId.toString() !== userId) {
      throw new BadRequestException('You do not have permission to access this notification');
    }
    
    return notification;
  }

  /**
   * Create a new message notification
   */
  async createNewMessageNotification(
    recipientId: string,
    senderId: string,
    messageId: string,
    conversationId: string,
    messagePreview: string,
    senderName: string,
    isGroupConversation: boolean,
    conversationTitle?: string
  ): Promise<Notification> {
    // Skip if recipient is the sender
    if (recipientId === senderId) {
      return null;
    }
    
    let title: string;
    let content: string;
    
    if (isGroupConversation) {
      title = `New message in ${conversationTitle || 'group'}`;
      content = `${senderName}: ${messagePreview}`;
    } else {
      title = `New message from ${senderName}`;
      content = messagePreview;
    }
    
    return this.create({
      type: NotificationType.NEW_MESSAGE,
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      messageId: new Types.ObjectId(messageId),
      title,
      content,
      priority: 'medium',
      read: false,
      clickAction: `/conversations/${conversationId}`
    });
  }

  /**
   * Create a message mention notification
   */
  async createMentionNotification(
    recipientId: string,
    senderId: string,
    messageId: string,
    conversationId: string,
    messagePreview: string,
    senderName: string
  ): Promise<Notification> {
    // Skip if recipient is the sender
    if (recipientId === senderId) {
      return null;
    }
    
    return this.create({
      type: NotificationType.MESSAGE_MENTION,
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      messageId: new Types.ObjectId(messageId),
      title: `${senderName} mentioned you`,
      content: messagePreview,
      priority: 'high',
      read: false,
      clickAction: `/conversations/${conversationId}`
    });
  }

  /**
   * Create a token transfer received notification
   */
  async createTransferReceivedNotification(
    recipientId: string,
    senderId: string,
    transactionId: string,
    conversationId: string,
    amount: string,
    tokenType: string,
    senderName: string
  ): Promise<Notification> {
    return this.create({
      type: NotificationType.TRANSFER_RECEIVED,
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      transactionId: new Types.ObjectId(transactionId),
      title: `Token transfer received`,
      content: `${senderName} sent you ${amount} ${tokenType}`,
      data: {
        amount,
        tokenType
      },
      priority: 'high',
      read: false,
      clickAction: `/transactions/${transactionId}`
    });
  }

  /**
   * Create a transfer status notification
   */
  async createTransferStatusNotification(
    recipientId: string,
    transactionId: string,
    txHash: string,
    status: string,
    tokenType: string,
    amount: string,
    isRecipient: boolean
  ): Promise<Notification> {
    let title: string;
    let content: string;
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let type: NotificationType;
    
    if (status === 'COMPLETED' || status === 'ACCEPTED_ON_L1') {
      type = NotificationType.TRANSFER_COMPLETED;
      title = isRecipient ? 'Transfer received' : 'Transfer completed';
      content = isRecipient 
        ? `You received ${amount} ${tokenType}` 
        : `Your transfer of ${amount} ${tokenType} was completed`;
      priority = 'medium';
    } else if (status === 'FAILED' || status === 'REJECTED' || status === 'REVERTED') {
      type = NotificationType.TRANSFER_FAILED;
      title = 'Transfer failed';
      content = `Your transfer of ${amount} ${tokenType} failed`;
      priority = 'high';
    } else {
      // Don't create notifications for intermediate states
      return null;
    }
    
    return this.create({
      type,
      recipientId: new Types.ObjectId(recipientId),
      transactionId: new Types.ObjectId(transactionId),
      title,
      content,
      data: {
        txHash,
        status,
        amount,
        tokenType
      },
      priority,
      read: false,
      clickAction: `/transactions/${transactionId}`
    });
  }

  /**
   * Create a conversation invite notification
   */
  async createConversationInviteNotification(
    recipientId: string,
    senderId: string,
    conversationId: string,
    senderName: string,
    conversationTitle: string,
    isGroupConversation: boolean
  ): Promise<Notification> {
    let title: string;
    let content: string;
    
    if (isGroupConversation) {
      title = `Added to group: ${conversationTitle}`;
      content = `${senderName} added you to the group conversation`;
    } else {
      title = `New conversation`;
      content = `${senderName} started a conversation with you`;
    }
    
    return this.create({
      type: NotificationType.CONVERSATION_INVITE,
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      title,
      content,
      priority: 'medium',
      read: false,
      clickAction: `/conversations/${conversationId}`
    });
  }

  /**
   * Create a system notification
   */
  async createSystemNotification(
    recipientId: string,
    type: NotificationType.SYSTEM_ALERT | NotificationType.SYSTEM_UPDATE | NotificationType.SECURITY_ALERT,
    title: string,
    content: string,
    data?: Record<string, any>,
    clickAction?: string,
    imageUrl?: string
  ): Promise<Notification> {
    return this.create({
      type,
      recipientId: new Types.ObjectId(recipientId),
      title,
      content,
      data,
      priority: type === NotificationType.SECURITY_ALERT ? 'high' : 'medium',
      read: false,
      clickAction,
      imageUrl
    });
  }

  /**
   * Create a friend request notification
   */
  async createFriendRequestNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    requestId: string
  ): Promise<Notification> {
    return this.create({
      type: NotificationType.FRIEND_REQUEST,
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      title: 'Friend Request',
      content: `${senderName} sent you a friend request`,
      data: {
        requestId
      },
      priority: 'medium',
      read: false,
      clickAction: `/friends/requests`
    });
  }
}
