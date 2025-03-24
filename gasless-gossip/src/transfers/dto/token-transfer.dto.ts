// File: src/modules/transfers/dto/token-transfer.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId, Matches, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TokenType } from '../interfaces/token-type.enum';

export class TokenTransferDto {
  @ApiProperty({
    description: 'ID of the recipient user',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({
    description: 'ID of the conversation',
    example: '60d21b4667d0d8992e610c86'
  })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'ID of the message to attach transfer to (optional)',
    example: '60d21b4667d0d8992e610c87',
    required: false
  })
  @IsMongoId()
  @IsOptional()
  messageId?: string;

  @ApiProperty({
    enum: TokenType,
    description: 'Type of token being transferred',
    example: TokenType.ERC20
  })
  @IsEnum(TokenType)
  @IsNotEmpty()
  tokenType: TokenType;

  @ApiProperty({
    description: 'Contract address of the token (not needed for ETH)',
    example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    required: false
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]+$/, {
    message: 'Token address must be a valid hex string starting with 0x'
  })
  @IsOptional()
  tokenAddress?: string;

  @ApiProperty({
    description: 'Token ID for ERC721 or ERC1155 tokens',
    example: '42',
    required: false
  })
  @IsString()
  @IsOptional()
  tokenId?: string;

  @ApiProperty({
    description: 'Amount to transfer (as string to handle large numbers)',
    example: '1000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, {
    message: 'Amount must be a valid number string'
  })
  amount: string;
}

export class TokenTransferResponseDto {
  @ApiProperty({
    description: 'Transfer ID',
    example: '60d21b4667d0d8992e610c88'
  })
  id: string;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0x4d9f89dba5ff2c3e26f8c961af0c0237f8f2669c60ca79663b57f5c359215032ec2a7caa8b356be05d0e274e358b9e66'
  })
  txHash: string;

  @ApiProperty({
    description: 'Transfer status',
    example: 'PENDING'
  })
  status: string;

  @ApiProperty({
    description: 'Transfer details',
    type: TokenTransferDto
  })
  transfer: TokenTransferDto;

  @ApiProperty({
    description: 'Estimated time to completion in seconds',
    example: 300
  })
  estimatedTimeToCompletion?: number;

  @ApiProperty({
    description: 'Block explorer URL',
    example: 'https://voyager.online/tx/0x4d9f89dba5ff2c3e26f8c961af0c0237f8f2669c60ca79663b57f5c359215032ec2a7caa8b356be05d0e274e358b9e66'
  })
  explorerUrl?: string;
}