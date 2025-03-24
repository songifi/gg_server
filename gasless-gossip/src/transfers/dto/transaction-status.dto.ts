// File: src/modules/transfers/dto/transaction-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '../interfaces/transaction-status.interface';

export class TransactionStatusDto {
  @ApiProperty({
    description: 'Transaction hash',
    example: '0x4d9f89dba5ff2c3e26f8c961af0c0237f8f2669c60ca79663b57f5c359215032ec2a7caa8b356be05d0e274e358b9e66'
  })
  txHash: string;

  @ApiProperty({
    enum: TransactionStatus,
    description: 'Current status of the transaction',
    example: TransactionStatus.ACCEPTED_ON_L2
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Block number where transaction was included',
    example: 12345,
    required: false
  })
  blockNumber?: number;

  @ApiProperty({
    description: 'Block hash where transaction was included',
    example: '0x123abc...',
    required: false
  })
  blockHash?: string;

  @ApiProperty({
    description: 'Timestamp of the status update',
    example: '2023-04-01T12:00:00.000Z'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Detailed transaction receipt',
    required: false,
    type: 'object'
  })
  receipt?: any;

  @ApiProperty({
    description: 'Error message if transaction failed',
    example: 'Insufficient balance',
    required: false
  })
  error?: string;

  @ApiProperty({
    description: 'Estimated time to completion in seconds',
    example: 120,
    required: false
  })
  estimatedTimeToCompletion?: number;

  @ApiProperty({
    description: 'Block explorer URL',
    example: 'https://voyager.online/tx/0x4d9f89dba5ff2c3e26f8c961af0c0237f8f2669c60ca79663b57f5c359215032ec2a7caa8b356be05d0e274e358b9e66',
    required: false
  })
  explorerUrl?: string;
}
