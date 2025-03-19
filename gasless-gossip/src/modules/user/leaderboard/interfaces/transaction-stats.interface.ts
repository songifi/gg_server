export interface TransactionStats {
    userId: string;
    totalValue: number;              // Sum of all transaction values
    transactionCount: number;        // Total number of transactions
    averageValue: number;            // Average value per transaction
    recipientCount: number;          // Number of unique recipients
    tokenCount: number;              // Total number of tokens sent
    streak: number;                  // Current daily transaction streak
    longestStreak: number;           // Longest daily transaction streak
    lastTransactionDate: Date;       // Date of last transaction
    firstTransactionDate: Date;      // Date of first transaction
    updatedAt: Date;                 // Last update timestamp
  }