// File: src/modules/messaging/gateways/messaging.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
    WsException,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, UseGuards } from '@nestjs/common';
  import { OnEvent } from '@nestjs/event-emitter';
  import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
  import { WsCurrentUser } from '../../auth/decorators/ws-current-user.decorator';
  import { Message } from '../schemas/message.schema';
  import { Conversation } from '../../conversation/schemas/conversation.schema';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(MessagingGateway.name);
    private userSockets = new Map<string, string[]>(); // userId -> [socketId]
  
    /**
     * Handle client connection
     */
    handleConnection(client: Socket): void {
      const userId = this.getUserIdFromSocket(client);
      
      if (userId) {
        // Store user's socket for delivering messages
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
     * Join conversation room
     */
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('joinConversation')
    joinConversation(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { conversationId: string },
      @WsCurrentUser() userId: string,
    ): void {
      if (!data.conversationId) {
        throw new WsException('Conversation ID is required');
      }
  
      client.join(`conversation:${data.conversationId}`);
      this.logger.debug(`User ${userId} joined conversation room ${data.conversationId}`);
    }
  
    /**
     * Leave conversation room
     */
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('leaveConversation')
    leaveConversation(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { conversationId: string },
    ): void {
      if (!data.conversationId) {
        throw new WsException('Conversation ID is required');
      }
  
      client.leave(`conversation:${data.conversationId}`);
    }
  
    /**
     * Typing indicator for conversation
     */
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('typing')
    handleTyping(
      @MessageBody() data: { conversationId: string; isTyping: boolean },
      @WsCurrentUser() userId: string,
    ): void {
      if (!data.conversationId) {
        throw new WsException('Conversation ID is required');
      }
  
      // Emit typing event to all clients in the conversation except the sender
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('userTyping', {
          userId,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        });
    }
  
    /**
     * Listen for new message events
     */
    @OnEvent('message.created')
    handleNewMessage(payload: { message: Message; conversation: Conversation; mentionedUserIds?: string[] }): void {
      const { message, conversation } = payload;
      const conversationId = conversation._id.toString();
      
      // Emit to conversation room
      this.server
        .to(`conversation:${conversationId}`)
        .emit('newMessage', this.formatMessageForClient(message));
      
      // For direct messages, ensure recipient is notified even if not in the room
      if (conversation.type === 'direct' && message.recipientId) {
        const recipientId = message.recipientId.toString();
        const recipientSockets = this.userSockets.get(recipientId) || [];
        
        recipientSockets.forEach(socketId => {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && !socket.rooms.has(`conversation:${conversationId}`)) {
            socket.emit('newMessage', this.formatMessageForClient(message));
          }
        });
      }
    }
  
    /**
     * Listen for new group message events
     */
    @OnEvent('message.group.created')
    handleNewGroupMessage(payload: { message: Message; conversation: Conversation; mentionedUserIds?: string[] }): void {
      const { message, conversation, mentionedUserIds = [] } = payload;
      const conversationId = conversation._id.toString();
      
      // Emit to conversation room
      this.server
        .to(`conversation:${conversationId}`)
        .emit('newGroupMessage', this.formatMessageForClient(message));
      
      // Notify all group members even if not in the room
      conversation.members.forEach(member => {
        const memberId = member.userId.toString();
        const senderId = message.senderId.toString();
        
        // Skip sender
        if (memberId === senderId || member.hasLeft) {
          return;
        }
        
        const memberSockets = this.userSockets.get(memberId) || [];
        const isMentioned = mentionedUserIds.includes(memberId);
        
        memberSockets.forEach(socketId => {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && !socket.rooms.has(`conversation:${conversationId}`)) {
            socket.emit('newGroupMessage', {
              ...this.formatMessageForClient(message),
              isMentioned,
            });
          }
        });
      });
    }
  
    /**
     * Listen for message read events
     */
    @OnEvent('message.read')
    handleMessageRead(payload: { 
      messageId: string; 
      userId: string; 
      conversationId: string; 
      readAt: Date;
      isGroupMessage: boolean;
    }): void {
      const { messageId, userId, conversationId, readAt, isGroupMessage } = payload;
      
      // Emit to conversation room
      this.server
        .to(`conversation:${conversationId}`)
        .emit('messageRead', {
          messageId,
          userId,
          conversationId,
          readAt,
          isGroupMessage,
        });
    }
  
    /**
     * Listen for message pinned events
     */
    @OnEvent('message.pinned')
    handleMessagePinned(payload: { 
      message: Message; 
      conversation: Conversation; 
      isPinned: boolean;
      pinnedBy: string;
    }): void {
      const { message, conversation, isPinned, pinnedBy } = payload;
      const conversationId = conversation._id.toString();
      
      // Emit to conversation room
      this.server
        .to(`conversation:${conversationId}`)
        .emit('messagePinned', {
          messageId: message._id.toString(),
          conversationId,
          isPinned,
          pinnedBy,
        });
    }
  
    /**
     * Format message for client
     */
    private formatMessageForClient(message: any): any {
      // Convert IDs to strings and format the message for the client
      return {
        id: message._id.toString(),
        senderId: message.senderId._id ? message.senderId._id.toString() : message.senderId.toString(),
        senderName: message.senderId.name,
        senderAvatar: message.senderId.avatar,
        conversationId: message.conversationId.toString(),
        groupId: message.groupId ? message.groupId.toString() : undefined,
        recipientId: message.recipientId ? message.recipientId.toString() : undefined,
        content: message.content,
        type: message.type,
        isPinned: message.isPinned,
        pinnedBy: message.pinnedBy ? {
          id: message.pinnedBy._id.toString(),
          name: message.pinnedBy.name,
        } : undefined,
        pinnedAt: message.pinnedAt,
        replyTo: message.replyToId ? {
          id: message.replyToId._id.toString(),
          content: message.replyToId.content,
          senderId: message.replyToId.senderId._id.toString(),
          senderName: message.replyToId.senderId.name,
        } : undefined,
        mentions: message.mentions ? message.mentions.map(mention => ({
          id: mention._id.toString(),
          name: mention.name,
        })) : [],
        status: message.status,
        metadata: message.metadata,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isDeleted: message.isDeleted,
        deletedAt: message.deletedAt,
        createdAt: message.createdAt,
        readReceipts: message.readReceipts ? message.readReceipts.map(receipt => ({
          userId: receipt.userId.toString(),
          readAt: receipt.readAt,
        })) : [],
      };
    }
  }