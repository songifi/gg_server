// src/modules/starknet/provider/exceptions/starknet-provider.exception.ts

import { HttpException, HttpStatus } from '@nestjs/common';

export type StarkNetErrorCode =
  | 'PROVIDER_INIT_ERROR'
  | 'INVALID_PROVIDER_TYPE'
  | 'PROVIDER_ERROR'
  | 'NETWORK_INFO_UNAVAILABLE'
  | 'NETWORK_UNAVAILABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'CIRCUIT_BREAKER_ERROR'
  | 'UNSUPPORTED_OPERATION'
  | 'RPC_CALL_FAILED'
  | 'GET_BLOCK_FAILED'
  | 'GET_TRANSACTION_FAILED'
  | 'GET_RECEIPT_FAILED'
  | 'ESTIMATE_FEE_FAILED';

export class StarkNetProviderException extends HttpException {
  constructor(
    message: string,
    public readonly code: StarkNetErrorCode,
    public readonly context?: Record<string, any>
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'StarkNet Provider Error',
        code,
        context,
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
