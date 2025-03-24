// File: src/modules/transfers/services/token-transfer.service.ts
import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
import { TokenTransferDto } from '../dto/token-transfer.dto';
import { TokenType } from '../interfaces/token-type.enum';
import { TransactionStatus } from '../interfaces/transaction-status.interface';
import { FeeEstimationService } from './fee-estimation.service';
import { TransactionStatusService } from './transaction-status.service';
import { StarknetProvider } from '../../blockchain/services/starknet-provider.service';
import { UserService } from '../../user/services/user.service';
import { ConversationService } from '../../conversation/services/conversation.service';
import { MessageService } from '../../messaging/services/message.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeeEstimateRequestDto } from '../dto/fee-estimate.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenTransferService {
  private readonly logger = new Logger(TokenTransferService.name);
  private readonly blockExplorerBaseUrl: string;

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private readonly feeEstimationService: FeeEstimationService,
    private readonly transactionStatusService: TransactionStatusService,
    private readonly starknetProvider: StarknetProvider,
    private readonly userService: UserService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.blockExplorerBaseUrl = this.configService.get<string>('STARKNET_EXPLORER_URL', 'https://voyager.online/tx/');
  }

  /**
   * Initiate a token transfer
   */
  async initiateTransfer(userId: string, transferDto: TokenTransferDto): Promise<Transaction> {
    // Validate the transfer request
    await this.validateTransfer(userId, transferDto);
    
    // Build the transaction
    const txCalldata = await this.buildTransferTransaction(userId, transferDto);
    
    // Submit transaction to StarkNet
    const txHash = await this.submitTransaction(txCalldata);
    
    // Create transaction record
    const transaction = new this.transactionModel({
      txHash,
      senderId: new Types.ObjectId(userId),
      recipientId: new Types.ObjectId(transferDto.recipientId),
      conversationId: new Types.ObjectId(transferDto.conversationId),
      tokenType: transferDto.tokenType,
      tokenAddress: transferDto.tokenAddress,
      tokenId: transferDto.tokenId,
      amount: transferDto.amount,
      status: TransactionStatus.PENDING,
      statusUpdatedAt: new Date()
    });
    
    // If message ID is provided, associate with message
    if (transferDto.messageId) {
      transaction.messageId = new Types.ObjectId(transferDto.messageId);
    }
    
    // Start tracking the transaction
    const savedTransaction = await this.transactionStatusService.trackTransaction(transaction);
    
    // Emit event for real-time updates
    this.eventEmitter.emit('transaction.initiated', { 
      transaction: savedTransaction, 
      blockExplorerUrl: this.getBlockExplorerUrl(txHash)
    });
    
    // If there's a messageId, update the message with the transaction info
    if (transferDto.messageId) {
      await this.attachTransferToMessage(transferDto.messageId, savedTransaction._id.toString());
    }
    
    return savedTransaction;
  }

  /**
   * Estimate fees for a transfer
   */
  async estimateTransferFee(transferDto: FeeEstimateRequestDto): Promise<any> {
    return this.feeEstimationService.estimateFee(transferDto);
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(txHash: string): Promise<Transaction> {
    return this.transactionStatusService.getTransactionStatus(txHash);
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactionHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    return this.transactionStatusService.getUserTransactionHistory(userId, page, limit);
  }

  /**
   * Get conversation transaction history
   */
  async getConversationTransactionHistory(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    // Verify user is a participant in the conversation
    await this.conversationService.validateParticipation(conversationId, userId);
    
    return this.transactionStatusService.getConversationTransactionHistory(conversationId, page, limit);
  }

  /**
   * Validate a transfer request
   */
  private async validateTransfer(userId: string, transferDto: TokenTransferDto): Promise<void> {
    // Validate token type requirements
    this.validateTokenTypeRequirements(transferDto);
    
    // Validate user has wallet connected
    await this.validateUserWallet(userId);
    
    // Validate recipient exists and has wallet
    await this.validateRecipient(transferDto.recipientId);
    
    // Validate conversation exists and user is participant
    await this.validateConversation(userId, transferDto.conversationId);
    
    // Validate message belongs to conversation if provided
    if (transferDto.messageId) {
      await this.validateMessage(transferDto.messageId, transferDto.conversationId);
    }
    
    // Validate amount is greater than zero
    if (BigInt(transferDto.amount) <= BigInt(0)) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    
    // Additional token-specific validations could be added here
  }

  /**
   * Validate token type specific requirements
   */
  private validateTokenTypeRequirements(transferDto: TokenTransferDto): void {
    switch (transferDto.tokenType) {
      case TokenType.ETH:
        // No special requirements for ETH
        break;
      case TokenType.ERC20:
        if (!transferDto.tokenAddress) {
          throw new BadRequestException('Token address is required for ERC20 transfers');
        }
        break;
      case TokenType.ERC721:
        if (!transferDto.tokenAddress) {
          throw new BadRequestException('Token address is required for ERC721 transfers');
        }
        if (!transferDto.tokenId) {
          throw new BadRequestException('Token ID is required for ERC721 transfers');
        }
        break;
      case TokenType.ERC1155:
        if (!transferDto.tokenAddress) {
          throw new BadRequestException('Token address is required for ERC1155 transfers');
        }
        if (!transferDto.tokenId) {
          throw new BadRequestException('Token ID is required for ERC1155 transfers');
        }
        break;
      default:
        throw new BadRequestException(`Unsupported token type: ${transferDto.tokenType}`);
    }
  }

  /**
   * Validate the user has a connected wallet
   */
  private async validateUserWallet(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (!user.walletAddress) {
      throw new BadRequestException('You need to connect a wallet before initiating transfers');
    }
  }

  /**
   * Validate recipient exists and has wallet
   */
  private async validateRecipient(recipientId: string): Promise<void> {
    const recipient = await this.userService.findById(recipientId);
    
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }
    
    if (!recipient.walletAddress) {
      throw new BadRequestException('Recipient does not have a connected wallet');
    }
  }

  /**
   * Validate conversation exists and user is participant
   */
  private async validateConversation(userId: string, conversationId: string): Promise<void> {
    // Verify conversation exists and user is participant
    await this.conversationService.validateParticipation(conversationId, userId);
  }

  /**
   * Validate message belongs to the conversation
   */
  private async validateMessage(messageId: string, conversationId: string): Promise<void> {
    const message = await this.messageService.findById(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    
    if (message.conversationId.toString() !== conversationId) {
      throw new BadRequestException('Message does not belong to the specified conversation');
    }
  }

  /**
   * Build a transfer transaction
   */
  private async buildTransferTransaction(
    userId: string, 
    transferDto: TokenTransferDto
  ): Promise<any> {
    // Get sender and recipient wallet addresses
    const sender = await this.userService.findById(userId);
    const recipient = await this.userService.findById(transferDto.recipientId);
    
    // Build appropriate transaction based on token type
    switch (transferDto.tokenType) {
      case TokenType.ETH:
        return this.buildEthTransferTransaction(sender.walletAddress, recipient.walletAddress, transferDto);
      case TokenType.ERC20:
        return this.buildErc20TransferTransaction(sender.walletAddress, recipient.walletAddress, transferDto);
      case TokenType.ERC721:
        return this.buildErc721TransferTransaction(sender.walletAddress, recipient.walletAddress, transferDto);
      case TokenType.ERC1155:
        return this.buildErc1155TransferTransaction(sender.walletAddress, recipient.walletAddress, transferDto);
      default:
        throw new BadRequestException(`Unsupported token type: ${transferDto.tokenType}`);
    }
  }

  /**
   * Build ETH transfer transaction
   */
  private buildEthTransferTransaction(
    senderAddress: string, 
    recipientAddress: string, 
    transferDto: TokenTransferDto
  ): any {
    return {
      contractAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract
      entrypoint: 'transfer',
      calldata: [
        recipientAddress, // recipient address
        transferDto.amount, // amount
        '0', // no additional data for ETH transfers
      ],
      senderAddress,
    };
  }

  /**
   * Build ERC20 transfer transaction
   */
  private buildErc20TransferTransaction(
    senderAddress: string, 
    recipientAddress: string, 
    transferDto: TokenTransferDto
  ): any {
    return {
      contractAddress: transferDto.tokenAddress,
      entrypoint: 'transfer',
      calldata: [
        recipientAddress, // recipient address
        transferDto.amount, // amount
      ],
      senderAddress,
    };
  }

  /**
   * Build ERC721 transfer transaction
   */
  private buildErc721TransferTransaction(
    senderAddress: string, 
    recipientAddress: string, 
    transferDto: TokenTransferDto
  ): any {
    return {
      contractAddress: transferDto.tokenAddress,
      entrypoint: 'safeTransferFrom',
      calldata: [
        senderAddress, // from address
        recipientAddress, // to address
        transferDto.tokenId, // token ID
      ],
      senderAddress,
    };
  }

  /**
   * Build ERC1155 transfer transaction
   */
  private buildErc1155TransferTransaction(
    senderAddress: string, 
    recipientAddress: string, 
    transferDto: TokenTransferDto
  ): any {
    return {
      contractAddress: transferDto.tokenAddress,
      entrypoint: 'safeTransferFrom',
      calldata: [
        senderAddress, // from address
        recipientAddress, // to address
        transferDto.tokenId, // token ID
        transferDto.amount, // amount
        '0', // data (empty)
      ],
      senderAddress,
    };
  }

  /**
   * Submit transaction to StarkNet
   */
  private async submitTransaction(txCalldata: any): Promise<string> {
    try {
      // Submit the transaction to the StarkNet network
      const result = await this.starknetProvider.submitTransaction(txCalldata);
      
      this.logger.debug(`Transaction submitted with hash: ${result.transaction_hash}`);
      
      return result.transaction_hash;
    } catch (error) {
      this.logger.error(`Transaction submission failed: ${error.message}`, error.stack);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Attach transfer to message
   */
  private async attachTransferToMessage(messageId: string, transactionId: string): Promise<void> {
    try {
      await this.messageService.attachTransfer(messageId, transactionId);
    } catch (error) {
      this.logger.error(`Failed to attach transfer to message: ${error.message}`, error.stack);
      // We don't want to fail the transfer if this step fails
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  private getBlockExplorerUrl(txHash: string): string {
    return `${this.blockExplorerBaseUrl}${txHash}`;
  }
}