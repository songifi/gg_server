// src/modules/achievements/dto/achievement-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { AchievementType } from '../enums/achievement-type.enum';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementRarity } from '../enums/achievement-rarity.enum';

class BadgeResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  imageUrl: string;
}

class CriteriaResponseDto {
  @Expose()
  type: string;

  @Expose()
  target: number;

  @Expose()
  conditions?: Record<string, any>;

  @Expose()
  progressTrackable: boolean;
}

@Exclude()
export class AchievementResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  type: AchievementType;

  @Expose()
  category: AchievementCategory;

  @Expose()
  rarity: AchievementRarity;

  @Expose()
  points: number;

  @Expose()
  @Type(() => BadgeResponseDto)
  badge: BadgeResponseDto;

  @Expose({ groups: ['admin'] })
  isSecret: boolean;

  @Expose({ groups: ['admin'] })
  @Type(() => CriteriaResponseDto)
  criteria: CriteriaResponseDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // User-specific data (only included when queried for a specific user)
  @Expose()
  userProgress?: {
    progress: number;
    target: number;
    percentComplete: number;
    isCompleted: boolean;
    completedAt?: Date;
  };

  constructor(partial: Partial<AchievementResponseDto>) {
    Object.assign(this, partial);
  }
}

