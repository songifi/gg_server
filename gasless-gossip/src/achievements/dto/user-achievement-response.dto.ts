// src/modules/achievements/dto/user-achievement-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class UserAchievementResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  achievementId: string;

  @Expose()
  progress: number;

  @Expose()
  target: number;

  @Expose()
  percentComplete: number;

  @Expose()
  isCompleted: boolean;

  @Expose()
  completedAt?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => AchievementResponseDto)
  achievement?: AchievementResponseDto;

  constructor(partial: Partial<UserAchievementResponseDto>) {
    Object.assign(this, partial);
  }
}
