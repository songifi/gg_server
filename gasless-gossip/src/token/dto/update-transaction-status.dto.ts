import { IsEnum, IsNotEmpty } from 'class-validator';
import { TransactionStatus } from '../enums/transaction-status.enum';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  @IsNotEmpty()
  status: TransactionStatus;
}
