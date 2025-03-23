// token.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenTransfer } from './schemas/token-transfer.schema';
import { CreateTokenTransferDto } from './dto/create-token-transfer.dto';
import { TransactionStatus } from './enums/transaction-status.enum';
import { StarkNetService } from './starknet.service';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(TokenTransfer.name)
    private readonly tokenTransferModel: Model<TokenTransfer>,
    private readonly starkNetService: StarkNetService,
  ) {}

  async createTransfer(dto: CreateTokenTransferDto): Promise<TokenTransfer> {
    // 1. Create a new document (PENDING)
    const newTransfer = new this.tokenTransferModel({
      senderId: dto.senderId,
      recipientId: dto.recipientId,
      amount: dto.amount,
      status: TransactionStatus.PENDING,
    });

    // 2. Save to DB
    const savedTransfer = await newTransfer.save();

    // 3. Simulate blockchain call
    const transactionHash = await this.starkNetService.initiateTransfer(
      dto.senderId,
      dto.recipientId,
      dto.amount,
    );

    // 4. Update document with transactionHash
    savedTransfer.transactionHash = transactionHash;
    await savedTransfer.save();

    return savedTransfer;
  }

  async updateTransactionStatus(id: string, status: TransactionStatus): Promise<TokenTransfer> {
    const transfer = await this.tokenTransferModel.findById(id);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    transfer.status = status;
    return transfer.save();
  }

  async checkAndUpdateTransactionStatus(id: string): Promise<TokenTransfer> {
    const transfer = await this.tokenTransferModel.findById(id);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // 2. Check status from StarkNet
    const currentStatus = await this.starkNetService.checkTransactionStatus(
      transfer.transactionHash,
    );

    // 3. Update DB if status changed
    if (transfer.status !== currentStatus) {
      transfer.status = currentStatus;
      await transfer.save();
    }

    return transfer;
  }
}
