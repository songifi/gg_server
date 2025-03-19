// src/modules/challenges/challenges.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { ChallengeSchema } from './schemas/challenge.schema';
import { ChallengeProgressSchema } from './schemas/challenge-progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Challenge', schema: ChallengeSchema },
      { name: 'ChallengeProgress', schema: ChallengeProgressSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}