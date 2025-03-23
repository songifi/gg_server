import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';
import { TokenTransfer, TokenTransferSchema } from './schemas/token-transfer.schema';
import { StarkNetService } from './starknet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TokenTransfer.name, schema: TokenTransferSchema },
    ]),
  ],
  controllers: [TokenController],
  providers: [TokenService, StarkNetService],
  exports: [TokenService],
})
export class TokenModule {}
