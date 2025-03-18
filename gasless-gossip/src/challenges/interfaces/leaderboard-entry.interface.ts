// src/modules/challenges/interfaces/leaderboard-entry.interface.ts
export interface LeaderboardEntry {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    currentValue: number;
    percentComplete: number;
    completedAt?: Date;
    rank: number;
  }