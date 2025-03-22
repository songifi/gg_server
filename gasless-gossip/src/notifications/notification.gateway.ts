// File: src/modules/notifications/notification.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from './entities/notification.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> [socketId]

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    const userId = this.getUserIdFromSocket(client);
    
    if (userId) {
      // Store user's socket for delivering notifications
      const userSockets = this.userSockets.get(userId) || [];
      if (!userSockets.includes(client.id)) {
        userSockets.push(client.id);
        this.userSockets.set(userId, userSockets);
        this.logger.debug(`User ${userId} connected with socket ${client.id}`);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    // Remove socket from all user mappings
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        this.logger.debug(`Removed socket ${client.id} for user ${userId}`);
        
        // Clean up empty entries
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  /**
   * Get user ID from socket (extracted from JWT token)
   */
  private getUserIdFromSocket(socket: Socket): string | null {
    // In a real implementation, extract user ID from the authenticated socket
    // This could be from a JWT token or session
    return socket.handshake.auth?.userId || null;
  }

  /**
   * Listen for new notification events
   */
  @OnEvent('notification.created')
  handleNewNotification(notification: Notification): void {
    const recipientId = notification.recipientId.toString();
    const recipientSockets = this.userSockets.get(recipientId) || [];
    
    // Format notification for client
    const clientNotification = {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      content: notification.content,
      data: notification.data,
      senderId: notification.senderId?.toString(),
      conversationId: notification.conversationId?.toString(),
      messageId: notification.messageId?.toString(),
      transactionId: notification.transactionId?.toString(),
      priority: notification.priority,
      read: notification.read,
      clickAction: notification.clickAction,
      imageUrl: notification.imageUrl,
      createdAt: notification.createdAt,
    };
    
    // Send to all recipient's connected sockets
    recipientSockets.forEach(socketId => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('notification', clientNotification);
      }
    });
    
    this.logger.debug(`Sent notification to user ${recipientId} on ${recipientSockets.length} sockets`);
  }
}