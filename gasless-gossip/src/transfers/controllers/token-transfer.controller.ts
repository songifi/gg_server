// File: src/modules/transfers/controllers/token-transfer.controller.ts
import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    ValidationPipe,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  import { TokenTransferService } from '../services/token-transfer.service';
  import { TokenTransferDto, TokenTransferResponseDto } from '../dto/token-transfer.dto';
  import { TransactionStatusDto } from '../dto/transaction-status.dto';
  import { FeeEstimateRequestDto, FeeEstimateResponseDto } from '../dto/fee-estimate.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  import { TransactionStatus } from '../interfaces/transaction-status.interface';
  
  @ApiTags('transfers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('transfers')
  export class TokenTransferController {
    constructor(private readonly tokenTransferService: TokenTransferService) {}
  
    @Post()
    @ApiOperation({ summary: 'Initiate a new token transfer' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Transfer initiated successfully',
      type: TokenTransferResponseDto,
    })
    @ApiBody({ type: TokenTransferDto })
    async initiateTransfer(
      @CurrentUser() userId: string,
      @Body(new ValidationPipe({ transform: true })) transferDto: TokenTransferDto,
    ): Promise<TokenTransferResponseDto> {
      const transaction = await this.tokenTransferService.initiateTransfer(userId, transferDto);
      
      return {
        id: transaction._id.toString(),
        txHash: transaction.txHash,
        status: transaction.status,
        transfer: {
          recipientId: transaction.recipientId.toString(),
          conversationId: transaction.conversationId.toString(),
          messageId: transaction.messageId?.toString(),
          tokenType: transaction.tokenType,
          tokenAddress: transaction.tokenAddress,
          tokenId: transaction.tokenId,
          amount: transaction.amount,
        },
        estimatedTimeToCompletion: this.getEstimatedTimeToCompletion(transaction.status),
        explorerUrl: `https://voyager.online/tx/${transaction.txHash}`,
      };
    }
  
    @Get(':txHash')
    @ApiOperation({ summary: 'Get token transfer status by transaction hash' })
    @ApiParam({ name: 'txHash', description: 'Transaction hash' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Transfer status retrieved successfully',
      type: TransactionStatusDto,
    })
    async getTransferStatus(
      @Param('txHash') txHash: string,
    ): Promise<TransactionStatusDto> {
      const transaction = await this.tokenTransferService.getTransferStatus(txHash);
      
      return {
        txHash: transaction.txHash,
        status: transaction.status,
        blockNumber: transaction.blockNumber,
        blockHash: transaction.blockHash,
        timestamp: transaction.statusUpdatedAt,
        receipt: transaction.receipt,
        error: transaction.error,
        estimatedTimeToCompletion: this.getEstimatedTimeToCompletion(transaction.status),
        explorerUrl: `https://voyager.online/tx/${transaction.txHash}`,
      };
    }
  
    @Get('estimate-fee')
    @ApiOperation({ summary: 'Estimate fees for a token transfer' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Fee estimation successful',
      type: FeeEstimateResponseDto,
    })
    async estimateFee(
      @Query(new ValidationPipe({ transform: true })) estimateRequestDto: FeeEstimateRequestDto,
    ): Promise<FeeEstimateResponseDto> {
      return this.tokenTransferService.estimateTransferFee(estimateRequestDto);
    }
  
    @Get('user/history')
    @ApiOperation({ summary: 'Get token transfer history for the current user' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Transfer history retrieved successfully',
    })
    async getUserTransferHistory(
      @CurrentUser() userId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ) {
      return this.tokenTransferService.getUserTransactionHistory(
        userId,
        page || 1,
        limit || 20,
      );
    }
  
    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get token transfer history for a conversation' })
    @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Conversation transfer history retrieved successfully',
    })
    async getConversationTransferHistory(
      @CurrentUser() userId: string,
      @Param('conversationId') conversationId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ) {
      return this.tokenTransferService.getConversationTransactionHistory(
        userId,
        conversationId,
        page || 1,
        limit || 20,
      );
    }
  
    /**
     * Get estimated time to completion based on transaction status
     */
    private getEstimatedTimeToCompletion(status: TransactionStatus): number {
      switch (status) {
        case TransactionStatus.PENDING:
          return 300; // 5 minutes
        case TransactionStatus.RECEIVED:
          return 180; // 3 minutes
        case TransactionStatus.ACCEPTED_ON_L2:
          return 60; // 1 minute until L1 acceptance
        case TransactionStatus.ACCEPTED_ON_L1:
        case TransactionStatus.COMPLETED:
        case TransactionStatus.FAILED:
        case TransactionStatus.REJECTED:
        case TransactionStatus.REVERTED:
          return 0; // Already completed
        default:
          return 300; // Default to 5 minutes
      }
    }
  }
  