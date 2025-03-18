import { Exclude, Expose } from 'class-transformer';
import { ReputationFactor } from '../enums/reputation-factor.enum';
import { ReputationChangeType } from '../enums/reputation-change-type.enum';
import { ReputationLevel } from '../enums/reputation-level.enum';

@Exclude()
export class ReputationHistoryResponseDto {
  @Expose()
  id: string;

  @Expose()
  factor: ReputationFactor;

  @Expose()
  changeType: ReputationChangeType;

  @Expose()
  points: number;

  @Expose()
  reason: string;

  @Expose()
  oldScore: number;

  @Expose()
  newScore: number;

  @Expose()
  oldLevel?: ReputationLevel;

  @Expose()
  newLevel?: ReputationLevel;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<ReputationHistoryResponseDto>) {
    Object.assign(this, partial);
  }
}
