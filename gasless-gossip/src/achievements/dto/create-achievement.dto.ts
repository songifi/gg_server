// src/modules/achievements/dto/create-achievement.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsBoolean, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AchievementType } from '../enums/achievement-type.enum';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementRarity } from '../enums/achievement-rarity.enum';

class AchievementCriteriaDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(1)
  target: number;

  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  progressTrackable: boolean;
}

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(AchievementType)
  type: AchievementType;

  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @IsEnum(AchievementRarity)
  rarity: AchievementRarity;

  @IsNumber()
  @Min(1)
  @Max(1000)
  points: number;

  @IsString()
  @IsNotEmpty()
  badgeId: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean = false;

  @ValidateNested()
  @Type(() => AchievementCriteriaDto)
  criteria: AchievementCriteriaDto;
}
