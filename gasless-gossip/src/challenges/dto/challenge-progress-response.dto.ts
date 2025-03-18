// src/modules/challenges/dto/challenge-progress-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { ProgressStatus } from '../enums/progress-status.enum';

@Exclude()
export class ChallengeProgressResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  challengeId: string;

  @Expose()
  status: ProgressStatus;

  @Expose()
  currentValue: number;

  @Expose()
  targetValue: number;

  @Expose()
  percentComplete: number;

  @Expose()
  completedAt?: Date;

  @Expose()
  rewardClaimed: boolean;

  @Expose()
  rewardClaimedAt?: Date;

  @Expose()
  joinedAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ChallengeProgressResponseDto>) {
    Object.assign(this, partial);
  }
}
