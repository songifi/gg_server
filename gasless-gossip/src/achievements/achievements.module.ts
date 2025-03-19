
// src/modules/achievements/achievements.module.ts
import { Module } from '@nestjs/module';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { AchievementSchema } from './schemas/achievement.schema';
import { BadgeSchema } from './schemas/badge.schema';
import { UserAchievementSchema } from './schemas/user-achievement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Achievement', schema: AchievementSchema },
      { name: 'Badge', schema: BadgeSchema },
      { name: 'UserAchievement', schema: UserAchievementSchema },
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
