// src/modules/challenges/dto/create-challenge.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsDate, IsOptional, ValidateNested, IsArray, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ChallengeType } from '../enums/challenge-type.enum';
import { RewardType } from '../enums/reward-type.enum';

class ChallengeCriteriaDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(1)
  target: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

class ChallengeRewardDto {
  @IsEnum(RewardType)
  type: RewardType;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @IsOptional()
  @IsString()
  badgeId?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ChallengeType)
  type: ChallengeType;

  @ValidateNested()
  @Type(() => ChallengeCriteriaDto)
  criteria: ChallengeCriteriaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChallengeRewardDto)
  rewards: ChallengeRewardDto[];

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean = false;
}