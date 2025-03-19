import { Document } from 'mongoose';
import { ReputationLevel } from '../enums/reputation-level.enum';

export interface Reputation extends Document {
  userId: string;                  // User ID
  score: number;                   // Overall reputation score
  level: ReputationLevel;          // Current reputation level
  metrics: ReputationMetrics;      // Detailed reputation metrics
  lastUpdated: Date;               // Last update timestamp
  createdAt: Date;                 // When record was created
}

export interface ReputationMetrics {
  messageActivity: number;         // Score for messaging activity
  tokenTransfers: number;          // Score for token transfers
  challengeCompletion: number;     // Score for completing challenges
  peerRatings: number;             // Score based on ratings from other users
  accountAge: number;              // Score based on account age
  contentQuality: number;          // Score based on content quality
  achievementPoints: number;       // Score based on achievements earned
}