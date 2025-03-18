import { LeaderboardCategory } from '../enums/leaderboard-category.enum';
import { TimePeriod } from '../enums/time-period.enum';

export class LeaderboardEntryDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  value: number;
  rank: number;
  
  constructor(partial: Partial<LeaderboardEntryDto>) {
    Object.assign(this, partial);
  }
}

export class LeaderboardResponseDto {
  category: LeaderboardCategory;
  period: TimePeriod;
  lastUpdated: Date;
  entries: LeaderboardEntryDto[];
  
  constructor(partial: Partial<LeaderboardResponseDto>) {
    Object.assign(this, partial);
  }
}
