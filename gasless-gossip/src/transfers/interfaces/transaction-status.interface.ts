// File: src/modules/transfers/interfaces/transaction-status.interface.ts
export enum TransactionStatus {
    PENDING = 'PENDING',
    RECEIVED = 'RECEIVED',
    ACCEPTED_ON_L2 = 'ACCEPTED_ON_L2',
    ACCEPTED_ON_L1 = 'ACCEPTED_ON_L1',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED',
    REVERTED = 'REVERTED',
    COMPLETED = 'COMPLETED'
  }
  
  export interface TransactionStatusUpdate {
    txHash: string;
    status: TransactionStatus;
    blockNumber?: number;
    blockHash?: string;
    timestamp: Date;
    receipt?: any;
    error?: string;
  }