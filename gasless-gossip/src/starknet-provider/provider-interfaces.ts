// src/modules/starknet/provider/interfaces/provider-options.interface.ts

import { BlockTag } from 'starknet';

export enum StarkNetNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  TESTNET2 = 'testnet2',
  INTEGRATION = 'integration',
}

export enum ProviderType {
  RPC = 'rpc',
  SEQUENCER = 'sequencer',
  INFURA = 'infura',
  ALCHEMY = 'alchemy',
}

export interface BaseProviderOptions {
  type: ProviderType;
  network: StarkNetNetwork;
  priority?: number; // Lower number means higher priority
  maxRetries?: number;
  timeout?: number; // In milliseconds
}

export interface RpcProviderOptions extends BaseProviderOptions {
  type: ProviderType.RPC;
  nodeUrl: string;
  apiKey?: string;
}

export interface SequencerProviderOptions extends BaseProviderOptions {
  type: ProviderType.SEQUENCER;
  baseUrl?: string;
  feederGatewayUrl?: string;
  gatewayUrl?: string;
}

export interface InfuraProviderOptions extends BaseProviderOptions {
  type: ProviderType.INFURA;
  apiKey: string;
}

export interface AlchemyProviderOptions extends BaseProviderOptions {
  type: ProviderType.ALCHEMY;
  apiKey: string;
}

export type ProviderOptions = 
  | RpcProviderOptions 
  | SequencerProviderOptions 
  | InfuraProviderOptions 
  | AlchemyProviderOptions;

// src/modules/starknet/provider/interfaces/network-info.interface.ts

export interface NetworkInfo {
  id: string;
  name: string;
  chainId: string;
  networkUrl: string;
  explorerUrl: string;
  isActive: boolean;
  isHealthy: boolean;
  lastCheckedAt: Date;
  blockHeight?: number;
}
