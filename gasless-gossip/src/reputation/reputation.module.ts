import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { ReputationSchema } from './schemas/reputation.schema';
import { ReputationHistorySchema } from './schemas/reputation-history.schema';
import { ReputationSettingsSchema } from './schemas/reputation-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Reputation', schema: ReputationSchema },
      { name: 'ReputationHistory', schema: ReputationHistorySchema },
      { name: 'ReputationSettings', schema: ReputationSettingsSchema },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
