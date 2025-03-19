// src/modules/challenges/dto/leaderboard-response.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LeaderboardEntryDto {
  @Expose()
  userId: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  currentValue: number;

  @Expose()
  percentComplete: number;

  @Expose()
  completedAt?: Date;

  @Expose()
  rank: number;

  constructor(partial: Partial<LeaderboardEntryDto>) {
    Object.assign(this, partial);
  }
}

export class LeaderboardResponseDto {
  challengeId: string;
  challengeTitle: string;
  totalParticipants: number;
  entries: LeaderboardEntryDto[];
}
