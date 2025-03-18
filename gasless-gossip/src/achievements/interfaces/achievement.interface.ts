
// src/modules/achievements/interfaces/achievement.interface.ts
import { Document } from 'mongoose';
import { AchievementType } from '../enums/achievement-type.enum';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementRarity } from '../enums/achievement-rarity.enum';

export interface Achievement extends Document {
  title: string;               // Achievement title
  description: string;         // Achievement description
  type: AchievementType;       // Type of achievement
  category: AchievementCategory; // Category of achievement
  rarity: AchievementRarity;   // Rarity level
  points: number;              // Points awarded for completing
  badgeId: string;             // Associated badge ID
  isSecret: boolean;           // Whether it's a secret achievement
  criteria: AchievementCriteria; // Criteria for completion
  createdAt: Date;             // When the achievement was created
  updatedAt: Date;             // When the achievement was last updated
}

export interface AchievementCriteria {
  type: string;                // Criteria type (e.g., 'message_count', 'transfer_amount')
  target: number;              // Target value to reach
  conditions?: Record<string, any>; // Additional conditions
  progressTrackable: boolean;  // Whether progress can be tracked incrementally
}
