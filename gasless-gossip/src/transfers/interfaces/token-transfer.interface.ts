// File: src/modules/transfers/interfaces/token-transfer.interface.ts
import { TokenType } from './token-type.enum';

export interface TokenTransfer {
  // Transfer identification
  id?: string;
  
  // Users involved
  senderId: string;
  recipientId: string;
  
  // Message and conversation context
  messageId?: string;
  conversationId: string;
  
  // Token details
  tokenType: TokenType;
  tokenAddress?: string; // Not needed for ETH
  tokenId?: string; // For ERC721 and ERC1155
  amount: string; // String to handle large numbers
  
  // Transaction details
  txHash?: string;
  status?: string;
  statusUpdatedAt?: Date;
  
  // Timestamps
  createdAt?: Date;
  completedAt?: Date;
}