// File: src/modules/notifications/listeners/transfer.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TransferNotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService, // Inject user service to get user details
  ) {}

  /**
   * Listen for transaction initiated events
   */
  @OnEvent('transaction.initiated')
  async handleTransactionInitiated(payload: any): Promise<void> {
    try {
      const { transaction } = payload;
      
      // Get sender name
      const sender = await this.userService.findById(transaction.senderId.toString());
      
      // Create notification for recipient
      await this.notificationService.createTransferReceivedNotification(
        transaction.recipientId.toString(),
        transaction.senderId.toString(),
        transaction._id.toString(),
        transaction.conversationId.toString(),
        transaction.amount,
        transaction.tokenType,
        sender.name
      );
    } catch (error) {
      console.error('Error creating transfer initiated notification:', error);
    }
  }

  /**
   * Listen for transaction status updates
   */
  @OnEvent('transaction.status.updated')
  async handleTransactionStatusUpdate(payload: any): Promise<void> {
    try {
      const { txHash, status } = payload;
      
      // Only notify on final statuses
      if (!['COMPLETED', 'ACCEPTED_ON_L1', 'FAILED', 'REJECTED', 'REVERTED'].includes(status)) {
        return;
      }
      
      // Get transaction details
      const transaction = await this.getTransactionByTxHash(txHash);
      if (!transaction) {
        return;
      }
      
      // Create notification for sender
      await this.notificationService.createTransferStatusNotification(
        transaction.senderId.toString(),
        transaction._id.toString(),
        txHash,
        status,
        transaction.tokenType,
        transaction.amount,
        false
      );
      
      // Create notification for recipient (only for completion)
      if (['COMPLETED', 'ACCEPTED_ON_L1'].includes(status)) {
        await this.notificationService.createTransferStatusNotification(
          transaction.recipientId.toString(),
          transaction._id.toString(),
          txHash,
          status,
          transaction.tokenType,
          transaction.amount,
          true
        );
      }
    } catch (error) {
      console.error('Error creating transfer status notification:', error);
    }
  }
  
  /**
   * Helper method to get transaction by txHash
   * In a real implementation, this would use the TransactionService
   */
  private async getTransactionByTxHash(txHash: string): Promise<any> {
    // Mock implementation - in real app would query database
    return {
      _id: '60d21b4667d0d8992e610c87',
      senderId: '60d21b4667d0d8992e610c85',
      recipientId: '60d21b4667d0d8992e610c86',
      tokenType: 'ETH',
      amount: '0.01',
    };
  }
}