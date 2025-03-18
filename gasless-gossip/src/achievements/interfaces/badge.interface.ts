// src/modules/achievements/interfaces/badge.interface.ts
import { Document } from 'mongoose';

export interface Badge extends Document {
  name: string;                // Badge name
  description: string;         // Badge description
  imageUrl: string;            // URL to badge image
  achievementId: string;       // Associated achievement ID
  createdAt: Date;             // When the badge was created
  updatedAt: Date;             // When the badge was last updated
}