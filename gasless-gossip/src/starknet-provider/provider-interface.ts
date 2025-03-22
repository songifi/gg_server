// src/modules/starknet/provider/starknet-provider.interface.ts

import { Provider, Block, Transaction, TransactionReceipt, Call, EstimateFeeResponse, BlockTag } from 'starknet';
import { StarkNetNetwork } from './interfaces/provider-options.interface';
import { NetworkStatusDto } from './dto/network-status.dto';

export interface IStarkNetProviderService {
  /**
   * Returns an initialized StarkNet provider
   */
  getProvider(): Provider;

  /**
   * Returns current network status and connection health
   */
  getNetworkStatus(): Promise<NetworkStatusDto>;

  /**
   * Changes the active network
   * @param networkId The network ID to switch to
   */
  switchNetwork(networkId: StarkNetNetwork): Promise<void>;

  /**
   * Makes a raw RPC call to the StarkNet node
   * @param method The RPC method to call
   * @param params The parameters for the RPC call
   */
  callRPC<T>(method: string, params: any[]): Promise<T>;

  /**
   * Gets block data
   * @param blockIdentifier Block hash, number, or tag
   */
  getBlock(blockIdentifier: string | number | BlockTag): Promise<Block>;

  /**
   * Gets transaction data
   * @param hash Transaction hash
   */
  getTransaction(hash: string): Promise<Transaction>;

  /**
   * Gets transaction receipt
   * @param hash Transaction hash
   */
  getTransactionReceipt(hash: string): Promise<TransactionReceipt>;

  /**
   * Estimates fee for a given transaction
   * @param calls The transaction call data
   * @param options Optional parameters for estimation
   */
  estimateFee(
    calls: Call | Call[],
    options?: {
      blockIdentifier?: BlockTag | string | number;
      skipValidate?: boolean;
    }
  ): Promise<EstimateFeeResponse>;
}
