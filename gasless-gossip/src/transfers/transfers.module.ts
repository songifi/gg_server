// File: src/modules/transfers/transfers.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenTransferService } from './services/token-transfer.service';
import { TransactionStatusService } from './services/transaction-status.service';
import { FeeEstimationService } from './services/fee-estimation.service';
import { TokenTransferController } from './controllers/token-transfer.controller';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { UserModule } from '../user/user.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BlockchainModule,
    UserModule,
    ConversationModule,
    MessagingModule,
  ],
  controllers: [TokenTransferController],
  providers: [
    TokenTransferService,
    TransactionStatusService,
    FeeEstimationService,
  ],
  exports: [
    TokenTransferService,
    TransactionStatusService,
  ],
})
export class TransfersModule {}

