
// src/modules/achievements/interfaces/user-achievement.interface.ts
import { Document } from 'mongoose';

export interface UserAchievement extends Document {
  userId: string;              // User ID
  achievementId: string;       // Achievement ID
  progress: number;            // Current progress value
  target: number;              // Target value to complete
  percentComplete: number;     // Percentage complete (0-100)
  isCompleted: boolean;        // Whether achievement is completed
  completedAt?: Date;          // When the achievement was completed
  createdAt: Date;             // When tracking started
  updatedAt: Date;             // When progress was last updated
}