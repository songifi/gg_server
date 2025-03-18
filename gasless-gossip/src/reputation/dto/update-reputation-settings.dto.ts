import { IsObject, IsBoolean, IsNumber, IsOptional, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FactorWeightsDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  messageActivity: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  tokenTransfers: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  challengeCompletion: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  peerRatings: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  accountAge: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  contentQuality: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  achievementPoints: number;
}

class LevelThresholdsDto {
  @IsNumber()
  @Min(0)
  newcomer: number;

  @IsNumber()
  @Min(0)
  regular: number;

  @IsNumber()
  @Min(0)
  established: number;

  @IsNumber()
  @Min(0)
  trusted: number;

  @IsNumber()
  @Min(0)
  veteran: number;

  @IsNumber()
  @Min(0)
  elite: number;
}

export class UpdateReputationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FactorWeightsDto)
  factorWeights?: FactorWeightsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LevelThresholdsDto)
  levelThresholds?: LevelThresholdsDto;

  @IsOptional()
  @IsBoolean()
  decayEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  decayRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}