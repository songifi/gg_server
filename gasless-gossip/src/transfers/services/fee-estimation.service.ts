// File: src/modules/transfers/services/fee-estimation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StarknetProvider } from '../../blockchain/services/starknet-provider.service';
import { FeeEstimateRequestDto, FeeEstimateResponseDto } from '../dto/fee-estimate.dto';
import { TokenType } from '../interfaces/token-type.enum';
import { constants } from 'starknet';
import BigNumber from 'bignumber.js';

@Injectable()
export class FeeEstimationService {
  private readonly logger = new Logger(FeeEstimationService.name);

  constructor(private readonly starknetProvider: StarknetProvider) {}

  /**
   * Estimate the fee for a token transfer transaction
   */
  async estimateFee(requestDto: FeeEstimateRequestDto): Promise<FeeEstimateResponseDto> {
    try {
      // Prepare the contract calls based on token type
      const { calldata, contractAddress } = this.prepareContractCallForEstimation(requestDto);

      // Estimate fee using Starknet provider
      const estimateResult = await this.starknetProvider.estimateFee(contractAddress, calldata);

      // Get current gas price
      const gasPrice = await this.starknetProvider.getGasPrice();

      // Convert the fee to readable format
      const response: FeeEstimateResponseDto = {
        estimatedFee: estimateResult.overallFee.toString(),
        gasUsage: estimateResult.gasUsage.toString(),
        gasPrice: gasPrice.toString(),
        additionalInfo: {
          l1DataGas: estimateResult.l1DataGas?.toString(),
          l1GasPrice: estimateResult.l1GasPrice?.toString(),
        }
      };

      // Convert fee to USD if price service is available
      try {
        const feeInEth = new BigNumber(estimateResult.overallFee.toString())
          .dividedBy(new BigNumber('1000000000000000000')); // Convert wei to ETH
        
        response.feeInUsd = await this.getUsdValue(feeInEth.toString());
      } catch (error) {
        this.logger.warn(`Failed to convert fee to USD: ${error.message}`);
      }

      return response;
    } catch (error) {
      this.logger.error(`Fee estimation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Prepare contract call data for fee estimation based on token type
   */
  private prepareContractCallForEstimation(dto: FeeEstimateRequestDto): { calldata: any, contractAddress: string } {
    switch (dto.tokenType) {
      case TokenType.ETH:
        return this.prepareEthTransfer(dto);
      case TokenType.ERC20:
        return this.prepareErc20Transfer(dto);
      case TokenType.ERC721:
        return this.prepareErc721Transfer(dto);
      case TokenType.ERC1155:
        return this.prepareErc1155Transfer(dto);
      default:
        throw new Error(`Unsupported token type: ${dto.tokenType}`);
    }
  }

  /**
   * Prepare ETH transfer call data
   */
  private prepareEthTransfer(dto: FeeEstimateRequestDto): { calldata: any, contractAddress: string } {
    // For ETH transfers, we use the ETH contract address (0x049d...)
    const contractAddress = constants.ETH_TOKEN_ADDRESS;
    
    // Prepare transfer calldata
    const calldata = {
      contractAddress,
      entrypoint: 'transfer',
      calldata: [
        // Recipient address would be filled in from user wallet
        '0x0', // Placeholder recipient
        dto.amount,
        '0', // No additional data for ETH transfers
      ],
    };

    return { calldata, contractAddress };
  }

  /**
   * Prepare ERC20 transfer call data
   */
  private prepareErc20Transfer(dto: FeeEstimateRequestDto): { calldata: any, contractAddress: string } {
    if (!dto.tokenAddress) {
      throw new Error('Token address is required for ERC20 transfers');
    }

    const contractAddress = dto.tokenAddress;
    
    // Prepare transfer calldata
    const calldata = {
      contractAddress,
      entrypoint: 'transfer',
      calldata: [
        // Recipient address would be filled in from user wallet
        '0x0', // Placeholder recipient
        dto.amount,
      ],
    };

    return { calldata, contractAddress };
  }

  /**
   * Prepare ERC721 transfer call data
   */
  private prepareErc721Transfer(dto: FeeEstimateRequestDto): { calldata: any, contractAddress: string } {
    if (!dto.tokenAddress) {
      throw new Error('Token address is required for ERC721 transfers');
    }

    if (!dto.tokenId) {
      throw new Error('Token ID is required for ERC721 transfers');
    }

    const contractAddress = dto.tokenAddress;
    
    // Prepare transfer calldata
    const calldata = {
      contractAddress,
      entrypoint: 'safeTransferFrom',
      calldata: [
        // From address would be filled in from user wallet
        '0x0', // Placeholder sender
        // Recipient address would be filled in from user wallet
        '0x0', // Placeholder recipient
        dto.tokenId,
      ],
    };

    return { calldata, contractAddress };
  }

  /**
   * Prepare ERC1155 transfer call data
   */
  private prepareErc1155Transfer(dto: FeeEstimateRequestDto): { calldata: any, contractAddress: string } {
    if (!dto.tokenAddress) {
      throw new Error('Token address is required for ERC1155 transfers');
    }

    if (!dto.tokenId) {
      throw new Error('Token ID is required for ERC1155 transfers');
    }

    const contractAddress = dto.tokenAddress;
    
    // Prepare transfer calldata
    const calldata = {
      contractAddress,
      entrypoint: 'safeTransferFrom',
      calldata: [
        // From address would be filled in from user wallet
        '0x0', // Placeholder sender
        // Recipient address would be filled in from user wallet
        '0x0', // Placeholder recipient
        dto.tokenId,
        dto.amount,
        '0', // Data (empty for this estimate)
      ],
    };

    return { calldata, contractAddress };
  }

  /**
   * Get USD value of ETH amount using price service
   * Note: In a real implementation, this would use a price oracle or API
   */
  private async getUsdValue(ethAmount: string): Promise<string> {
    // This is a simplified implementation
    // In production, you would use a proper price feed
    const mockEthPrice = 3000; // Mock ETH price in USD
    const usdValue = new BigNumber(ethAmount).multipliedBy(mockEthPrice);
    return usdValue.toFixed(2);
  }
}
