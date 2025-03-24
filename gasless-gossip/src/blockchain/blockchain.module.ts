// File: src/modules/blockchain/blockchain.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StarknetProvider } from './services/starknet-provider.service';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    StarknetProvider,
  ],
  exports: [
    StarknetProvider,
  ],
})
export class BlockchainModule {}