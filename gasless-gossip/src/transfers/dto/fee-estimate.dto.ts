// File: src/modules/transfers/dto/fee-estimate.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TokenType } from '../interfaces/token-type.enum';

export class FeeEstimateRequestDto {
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

export class FeeEstimateResponseDto {
  @ApiProperty({
    description: 'Estimated fee in wei',
    example: '12500000000000'
  })
  estimatedFee: string;

  @ApiProperty({
    description: 'Gas usage',
    example: '25000'
  })
  gasUsage: string;

  @ApiProperty({
    description: 'Current gas price in wei',
    example: '500000000'
  })
  gasPrice: string;

  @ApiProperty({
    description: 'Fee in USD',
    example: '0.25'
  })
  feeInUsd?: string;

  @ApiProperty({
    description: 'Additional information',
    example: {
      l1DataGas: '1234',
      l1GasPrice: '50000000',
    },
    required: false,
    type: 'object'
  })
  additionalInfo?: Record<string, any>;
}
