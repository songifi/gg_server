// File: src/modules/transfers/transfers.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WsCurrentUser } from '../auth/decorators/ws-current-user.decorator';
import { TransactionStatusUpdate } from './interfaces/transaction-status.interface';
import { Transaction } from './entities/transaction.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TransfersGateway {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string[]>(); // userId -> [socketId]

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    // Authentication and userId extraction handled by guard in joinRoom method
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
        
        // Clean up empty entries
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  /**
   * Join room for transaction updates
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinTransferRoom')
  joinRoom(
    @MessageBody() data: { transactionId?: string, conversationId?: string },
    @WsCurrentUser() userId: string,
    client: Socket,
  ): void {
    // Store user socket mapping
    const userSockets = this.userSockets.get(userId) || [];
    if (!userSockets.includes(client.id)) {
      userSockets.push(client.id);
      this.userSockets.set(userId, userSockets);
    }

    // Join specific transaction room if provided
    if (data.transactionId) {
      client.join(`transaction:${data.transactionId}`);
    }
    
    // Join conversation transaction room if provided
    if (data.conversationId) {
      client.join(`conversation:${data.conversationId}:transfers`);
    }
  }

  /**
   * Leave room for transaction updates
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveTransferRoom')
  leaveRoom(
    @MessageBody() data: { transactionId?: string, conversationId?: string },
    client: Socket,
  ): void {
    // Leave specific transaction room if provided
    if (data.transactionId) {
      client.leave(`transaction:${data.transactionId}`);
    }
    
    // Leave conversation transaction room if provided
    if (data.conversationId) {
      client.leave(`conversation:${data.conversationId}:transfers`);
    }
  }

  /**
   * Listen for transaction status updates
   */
  @OnEvent('transaction.status.updated')
  handleTransactionStatusUpdate(statusUpdate: TransactionStatusUpdate): void {
    // Emit to transaction specific room
    this.server.to(`transaction:${statusUpdate.txHash}`).emit('transferStatusUpdate', statusUpdate);
  }

  /**
   * Listen for new transaction events
   */
  @OnEvent('transaction.initiated')
  handleTransactionInitiated(data: { transaction: Transaction, blockExplorerUrl: string }): void {
    const { transaction, blockExplorerUrl } = data;
    
    // Emit to conversation room
    this.server
      .to(`conversation:${transaction.conversationId}:transfers`)
      .emit('transferInitiated', {
        transactionId: transaction._id,
        txHash: transaction.txHash,
        senderId: transaction.senderId,
        recipientId: transaction.recipientId,
        amount: transaction.amount,
        tokenType: transaction.tokenType,
        status: transaction.status,
        blockExplorerUrl,
      });
      
    // Emit to sender sockets
    const senderSockets = this.userSockets.get(transaction.senderId.toString()) || [];
    senderSockets.forEach(socketId => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('yourTransferInitiated', {
          transactionId: transaction._id,
          txHash: transaction.txHash,
          recipientId: transaction.recipientId,
          amount: transaction.amount,
          tokenType: transaction.tokenType,
          status: transaction.status,
          blockExplorerUrl,
        });
      }
    });
    
    // Emit to recipient sockets
    const recipientSockets = this.userSockets.get(transaction.recipientId.toString()) || [];
    recipientSockets.forEach(socketId => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('transferReceived', {
          transactionId: transaction._id,
          txHash: transaction.txHash,
          senderId: transaction.senderId,
          amount: transaction.amount,
          tokenType: transaction.tokenType,
          status: transaction.status,
          blockExplorerUrl,
        });
      }
    });
  }
}
