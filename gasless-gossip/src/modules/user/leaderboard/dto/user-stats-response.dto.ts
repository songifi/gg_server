export class UserStatsResponseDto {
    userId: string;
    username: string;
    displayName: string;
    totalValue: number;
    transactionCount: number;
    averageValue: number;
    recipientCount: number;
    tokenCount: number;
    streak: number;
    longestStreak: number;
    rankings: {
      category: string;
      period: string;
      rank: number;
      value: number;
    }[];
    
    constructor(partial: Partial<UserStatsResponseDto>) {
      Object.assign(this, partial);
    }
  }
  