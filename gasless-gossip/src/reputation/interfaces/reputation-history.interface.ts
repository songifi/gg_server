import { Document } from 'mongoose';
import { ReputationFactor } from '../enums/reputation-factor.enum';
import { ReputationChangeType } from '../enums/reputation-change-type.enum';

export interface ReputationHistory extends Document {
  userId: string;                  // User ID
  factor: ReputationFactor;        // Which factor changed
  changeType: ReputationChangeType; // Increase or decrease
  points: number;                  // Points changed (absolute value)
  reason: string;                  // Human-readable reason
  oldScore: number;                // Previous total score
  newScore: number;                // New total score
  oldLevel?: ReputationLevel;      // Previous level (if changed)
  newLevel?: ReputationLevel;      // New level (if changed)
  metadata?: Record<string, any>;  // Additional data about the change
  createdAt: Date;                 // When change occurred
}