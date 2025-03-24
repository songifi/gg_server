// token.controller.ts
import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { TokenService } from './token.service';
import { CreateTokenTransferDto } from './dto/create-token-transfer.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('transfer')
  async createTransfer(@Body() dto: CreateTokenTransferDto) {
    return this.tokenService.createTransfer(dto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTransactionStatusDto) {
    return this.tokenService.updateTransactionStatus(id, dto.status);
  }

  @Get(':id/check-status')
  async checkStatus(@Param('id') id: string) {
    return this.tokenService.checkAndUpdateTransactionStatus(id);
  }
}
