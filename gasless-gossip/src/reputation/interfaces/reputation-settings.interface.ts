import { Document } from 'mongoose';

export interface ReputationSettings extends Document {
  factorWeights: {
    messageActivity: number;
    tokenTransfers: number;
    challengeCompletion: number;
    peerRatings: number;
    accountAge: number;
    contentQuality: number;
    achievementPoints: number;
  };
  levelThresholds: {
    newcomer: number;
    regular: number;
    established: number;
    trusted: number;
    veteran: number;
    elite: number;
  };
  decayEnabled: boolean;
  decayRate: number;              // Points per day for inactive users
  maxScore: number;               // Maximum possible reputation score
  minScore: number;               // Minimum possible reputation score
  isActive: boolean;              // Whether reputation system is active
  updatedAt: Date;                // Last settings update
}