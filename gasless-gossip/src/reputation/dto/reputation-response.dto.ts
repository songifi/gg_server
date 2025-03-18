import { Exclude, Expose, Type } from 'class-transformer';
import { ReputationLevel } from '../enums/reputation-level.enum';

class MetricsResponseDto {
  @Expose()
  messageActivity: number;

  @Expose()
  tokenTransfers: number;

  @Expose()
  challengeCompletion: number;

  @Expose()
  peerRatings: number;

  @Expose()
  accountAge: number;

  @Expose()
  contentQuality: number;

  @Expose()
  achievementPoints: number;
}

@Exclude()
export class ReputationResponseDto {
  @Expose()
  userId: string;

  @Expose()
  score: number;

  @Expose()
  level: ReputationLevel;

  @Expose()
  @Type(() => MetricsResponseDto)
  metrics: MetricsResponseDto;

  @Expose()
  lastUpdated: Date;

  @Expose()
  nextLevel?: {
    name: ReputationLevel;
    threshold: number;
    pointsNeeded: number;
  };

  constructor(partial: Partial<ReputationResponseDto>) {
    Object.assign(this, partial);
  }
}
