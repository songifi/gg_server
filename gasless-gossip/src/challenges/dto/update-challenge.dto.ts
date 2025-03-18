    // src/modules/challenges/dto/update-challenge.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, IsDate, ValidateNested, IsArray, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ChallengeType } from '../enums/challenge-type.enum';
import { ChallengeStatus } from '../enums/challenge-status.enum';

export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @IsOptional()
  @IsEnum(ChallengeStatus)
  status?: ChallengeStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChallengeCriteriaDto)
  criteria?: ChallengeCriteriaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChallengeRewardDto)
  rewards?: ChallengeRewardDto[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

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
  isActive?: boolean;
}