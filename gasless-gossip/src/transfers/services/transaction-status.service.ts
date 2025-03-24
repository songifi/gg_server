// File: src/modules/transfers/services/transaction-status.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus, TransactionStatusUpdate } from '../interfaces/transaction-status.interface';
import { StarknetProvider } from '../../blockchain/services/starknet-provider.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TransactionStatusService {
  private readonly logger = new Logger(TransactionStatusService.name);
  private readonly pendingTxCache = new Map<string, number>(); // txHash -> retry count
  private readonly MAX_RETRIES = 50; // Max number of status check retries

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private readonly starknetProvider: StarknetProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get the status of a transaction by hash
   */
  async getTransactionStatus(txHash: string): Promise<Transaction> {
    const transaction = await this.transactionModel.findOne({ txHash }).exec();
    
    if (!transaction) {
      throw new Error(`Transaction with hash ${txHash} not found`);
    }
    
    // If transaction is not in a final state, refresh the status
    if (!this.isTransactionInFinalState(transaction.status)) {
      await this.refreshTransactionStatus(txHash);
      return this.transactionModel.findOne({ txHash }).exec();
    }
    
    return transaction;
  }

  /**
   * Store a new transaction and start tracking its status
   */
  async trackTransaction(transaction: Transaction): Promise<Transaction> {
    const savedTransaction = await transaction.save();
    
    // Add to pending cache for background polling
    this.pendingTxCache.set(savedTransaction.txHash, 0);
    
    // Immediately check status once
    this.scheduleStatusCheck(savedTransaction.txHash);
    
    return savedTransaction;
  }

  /**
   * Check and update the status of a transaction
   */
  async refreshTransactionStatus(txHash: string): Promise<TransactionStatusUpdate> {
    try {
      const txStatus = await this.starknetProvider.getTransactionStatus(txHash);
      const statusUpdate = this.mapProviderStatusToAppStatus(txStatus, txHash);
      
      await this.updateTransactionStatus(statusUpdate);
      
      // Emit event for real-time updates
      this.eventEmitter.emit('transaction.status.updated', statusUpdate);
      
      return statusUpdate;
    } catch (error) {
      this.logger.error(`Failed to refresh transaction status for ${txHash}: ${error.message}`, error.stack);
      
      // If we get a "transaction not found" error from provider after several retries,
      // mark it as rejected
      if (
        (error.message.includes('not found') || error.message.includes('getTransaction')) && 
        this.pendingTxCache.get(txHash) > 10
      ) {
        const statusUpdate: TransactionStatusUpdate = {
          txHash,
          status: TransactionStatus.REJECTED,
          timestamp: new Date(),
          error: 'Transaction not found on network after multiple attempts',
        };
        
        await this.updateTransactionStatus(statusUpdate);
        this.eventEmitter.emit('transaction.status.updated', statusUpdate);
        return statusUpdate;
      }
      
      throw error;
    }
  }

  /**
   * Schedule an immediate status check for a transaction
   */
  private scheduleStatusCheck(txHash: string): void {
    setTimeout(async () => {
      try {
        await this.refreshTransactionStatus(txHash);
      } catch (error) {
        this.logger.error(`Scheduled status check failed for ${txHash}: ${error.message}`);
      }
    }, 1000); // Wait 1 second before first check
  }

  /**
   * Update transaction status in the database
   */
  private async updateTransactionStatus(statusUpdate: TransactionStatusUpdate): Promise<void> {
    const { txHash, status, blockNumber, blockHash, error } = statusUpdate;
    
    const updateData: any = {
      status,
      statusUpdatedAt: new Date(),
    };
    
    if (blockNumber) updateData.blockNumber = blockNumber;
    if (blockHash) updateData.blockHash = blockHash;
    if (error) updateData.error = error;
    
    // If transaction is now complete, add completedAt timestamp
    if (status === TransactionStatus.COMPLETED || status === TransactionStatus.ACCEPTED_ON_L1) {
      updateData.completedAt = new Date();
    }
    
    // If transaction failed or was rejected, add error information
    if (status === TransactionStatus.FAILED || status === TransactionStatus.REJECTED || status === TransactionStatus.REVERTED) {
      updateData.error = error || 'Transaction failed without specific error';
    }
    
    // Update the transaction
    await this.transactionModel.updateOne(
      { txHash },
      { $set: updateData }
    );
    
    // Remove from pending cache if in final state
    if (this.isTransactionInFinalState(status)) {
      this.pendingTxCache.delete(txHash);
    }
  }

  /**
   * Map provider-specific status to our application status
   */
  private mapProviderStatusToAppStatus(
    providerStatus: any, 
    txHash: string
  ): TransactionStatusUpdate {
    // Extract status and other details from provider response
    const status = this.determineTransactionStatus(providerStatus);
    
    const statusUpdate: TransactionStatusUpdate = {
      txHash,
      status,
      timestamp: new Date(),
    };
    
    // Add additional data if available
    if (providerStatus.block_number) {
      statusUpdate.blockNumber = providerStatus.block_number;
    }
    
    if (providerStatus.block_hash) {
      statusUpdate.blockHash = providerStatus.block_hash;
    }
    
    if (providerStatus.transaction_failure_reason) {
      statusUpdate.error = providerStatus.transaction_failure_reason.error_message || 
                          'Transaction failed without specific error';
    }
    
    if (providerStatus.receipt) {
      statusUpdate.receipt = providerStatus.receipt;
    }
    
    return statusUpdate;
  }

  /**
   * Determine transaction status from provider response
   */
  private determineTransactionStatus(providerStatus: any): TransactionStatus {
    // Map provider-specific status to our application status
    if (providerStatus.finality_status === 'ACCEPTED_ON_L1') {
      return TransactionStatus.ACCEPTED_ON_L1;
    } else if (providerStatus.finality_status === 'ACCEPTED_ON_L2') {
      return TransactionStatus.ACCEPTED_ON_L2;
    } else if (providerStatus.status === 'RECEIVED') {
      return TransactionStatus.RECEIVED;
    } else if (providerStatus.status === 'PENDING') {
      return TransactionStatus.PENDING;
    } else if (providerStatus.status === 'REJECTED') {
      return TransactionStatus.REJECTED;
    } else if (providerStatus.execution_status === 'REVERTED') {
      return TransactionStatus.REVERTED;
    } else if (providerStatus.transaction_failure_reason) {
      return TransactionStatus.FAILED;
    }
    
    // If we have a block number and receipt, but no explicit failure, consider it completed
    if (providerStatus.block_number && providerStatus.receipt && !providerStatus.transaction_failure_reason) {
      return TransactionStatus.COMPLETED;
    }
    
    // Default to pending if we can't determine status
    return TransactionStatus.PENDING;
  }

  /**
   * Check if a transaction status represents a final state
   */
  private isTransactionInFinalState(status: TransactionStatus): boolean {
    return [
      TransactionStatus.COMPLETED,
      TransactionStatus.ACCEPTED_ON_L1,
      TransactionStatus.FAILED,
      TransactionStatus.REJECTED,
      TransactionStatus.REVERTED
    ].includes(status);
  }

  /**
   * Background job to poll and update status of pending transactions
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async pollPendingTransactions() {
    const pendingTxHashes = [...this.pendingTxCache.keys()];
    
    if (pendingTxHashes.length === 0) {
      return;
    }
    
    this.logger.debug(`Polling ${pendingTxHashes.length} pending transactions...`);
    
    // Process each pending transaction
    for (const txHash of pendingTxHashes) {
      try {
        // Increment retry count
        const currentRetries = this.pendingTxCache.get(txHash) || 0;
        this.pendingTxCache.set(txHash, currentRetries + 1);
        
        // If we've exceeded max retries, mark as rejected
        if (currentRetries > this.MAX_RETRIES) {
          const statusUpdate: TransactionStatusUpdate = {
            txHash,
            status: TransactionStatus.REJECTED,
            timestamp: new Date(),
            error: 'Transaction status could not be determined after maximum retries',
          };
          
          await this.updateTransactionStatus(statusUpdate);
          this.pendingTxCache.delete(txHash);
          this.eventEmitter.emit('transaction.status.updated', statusUpdate);
          continue;
        }
        
        // Check status
        await this.refreshTransactionStatus(txHash);
      } catch (error) {
        this.logger.error(`Error polling status for ${txHash}: ${error.message}`);
      }
    }
  }

  /**
   * Find all transactions requiring status updates
   * Called on service startup to rebuild the pending tx cache
   */
  @Cron(CronExpression.EVERY_HOUR)
  async rebuildPendingTransactionCache() {
    try {
      const pendingTransactions = await this.transactionModel.find({
        status: {
          $in: [
            TransactionStatus.PENDING,
            TransactionStatus.RECEIVED,
            TransactionStatus.ACCEPTED_ON_L2
          ]
        },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).exec();
      
      this.logger.debug(`Rebuilding pending transaction cache with ${pendingTransactions.length} transactions`);
      
      // Reset the cache
      this.pendingTxCache.clear();
      
      // Add all pending transactions to the cache
      for (const tx of pendingTransactions) {
        this.pendingTxCache.set(tx.txHash, 0);
      }
    } catch (error) {
      this.logger.error(`Failed to rebuild pending transaction cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactionHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    // Find transactions where user is either sender or recipient
    const query = {
      $or: [
        { senderId: userId },
        { recipientId: userId }
      ]
    };
    
    const total = await this.transactionModel.countDocuments(query);
    
    const transactions = await this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar')
      .populate('recipientId', 'name avatar')
      .exec();
    
    return {
      transactions,
      total,
      page,
      limit
    };
  }

  /**
   * Get transaction history for a conversation
   */
  async getConversationTransactionHistory(
    conversationId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = { conversationId };
    
    const total = await this.transactionModel.countDocuments(query);
    
    const transactions = await this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar')
      .populate('recipientId', 'name avatar')
      .exec();
    
    return {
      transactions,
      total,
      page,
      limit
    };
  }
}
