// src/modules/starknet/provider/starknet-provider.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { StarkNetProviderService } from './starknet-provider.service';

@Global() // Make the service available throughout the application
@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // Default TTL: 1 minute
      max: 100, // Maximum number of items in cache
    }),
  ],
  providers: [StarkNetProviderService],
  exports: [StarkNetProviderService],
})
export class StarkNetProviderModule {}
