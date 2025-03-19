import { Module, CacheModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { TransactionStatsSchema } from './schemas/transaction-stats.schema';
import { DailyStatsSchema } from './schemas/daily-stats.schema';
import { LeaderboardCacheSchema } from './schemas/leaderboard-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'TransactionStats', schema: TransactionStatsSchema },
      { name: 'DailyStats', schema: DailyStatsSchema },
      { name: 'LeaderboardCache', schema: LeaderboardCacheSchema },
    ]),
    CacheModule.register({
      ttl: 30, // Default cache TTL (30 seconds)
      max: 100, // Maximum number of items in cache
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
