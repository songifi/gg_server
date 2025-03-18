// src/modules/challenges/dto/challenge-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { ChallengeType } from '../enums/challenge-type.enum';
import { ChallengeStatus } from '../enums/challenge-status.enum';

class CriteriaResponseDto {
  @Expose()
  type: string;

  @Expose()
  target: number;

  @Expose()
  description: string;

  @Expose()
  metadata?: Record<string, any>;
}

class RewardResponseDto {
  @Expose()
  type: RewardType;

  @Expose()
  amount?: string;

  @Expose()
  tokenAddress?: string;

  @Expose()
  badgeId?: string;

  @Expose()
  roleId?: string;

  @Expose()
  description: string;

  @Expose()
  metadata?: Record<string, any>;
}

@Exclude()
export class ChallengeResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  type: ChallengeType;

  @Expose()
  status: ChallengeStatus;

  @Expose()
  @Type(() => CriteriaResponseDto)
  criteria: CriteriaResponseDto;

  @Expose()
  @Type(() => RewardResponseDto)
  rewards: RewardResponseDto[];

  @Expose()
  startDate: Date;

  @Expose()
  endDate?: Date;

  @Expose()
  maxParticipants?: number;

  @Expose()
  participantCount: number;

  @Expose()
  completionCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  userProgress?: {
    status: ProgressStatus;
    currentValue: number;
    targetValue: number;
    percentComplete: number;
    completedAt?: Date;
    rewardClaimed: boolean;
  };

  constructor(partial: Partial<ChallengeResponseDto>) {
    Object.assign(this, partial);
  }
}
