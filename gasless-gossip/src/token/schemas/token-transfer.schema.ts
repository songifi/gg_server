import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Schema({ timestamps: true })
export class TokenTransfer extends Document {
  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  recipientId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop()
  transactionHash: string;
}

export const TokenTransferSchema = SchemaFactory.createForClass(TokenTransfer);
