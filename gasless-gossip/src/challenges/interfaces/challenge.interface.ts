// src/modules/challenges/interfaces/challenge.interface.ts
import { Document } from 'mongoose';
import { ChallengeType } from '../enums/challenge-type.enum';
import { ChallengeStatus } from '../enums/challenge-status.enum';
import { RewardType } from '../enums/reward-type.enum';

export interface Challenge extends Document {
  title: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  criteria: ChallengeCriteria;
  rewards: ChallengeReward[];
  startDate: Date;
  endDate?: Date;
  maxParticipants?: number;
  participantCount: number;
  completionCount: number;
  createdBy: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface ChallengeCriteria {
  type: string;
  target: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface ChallengeReward {
  type: RewardType;
  amount?: string;
  tokenAddress?: string;
  badgeId?: string;
  roleId?: string;
  description: string;
  metadata?: Record<string, any>;
}
