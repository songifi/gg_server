// src/modules/challenges/interfaces/challenge-progress.interface.ts
import { Document } from 'mongoose';
import { ProgressStatus } from '../enums/progress-status.enum';

export interface ChallengeProgress extends Document {
  userId: string;
  challengeId: string;
  status: ProgressStatus;
  currentValue: number;
  targetValue: number;
  percentComplete: number;
  completedAt?: Date;
  rewardClaimed: boolean;
  rewardClaimedAt?: Date;
  joinedAt: Date;
  updatedAt: Date;
}