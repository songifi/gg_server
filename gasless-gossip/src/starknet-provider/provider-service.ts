// src/modules/starknet/provider/starknet-provider.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { 
  Provider, 
  RpcProvider, 
  SequencerProvider,
  Contract, 
  Block, 
  Transaction, 
  Call,
  TransactionReceipt,
  BlockTag,
  EstimateFeeResponse,
  constants
} from 'starknet';
import * as CircuitBreaker from 'opossum';
import { IStarkNetProviderService } from './starknet-provider.interface';
import { 
  ProviderOptions, 
  ProviderType, 
  StarkNetNetwork,
  RpcProviderOptions,
  SequencerProviderOptions,
  InfuraProviderOptions,
  AlchemyProviderOptions
} from './interfaces/provider-options.interface';
import { NetworkInfo } from './interfaces/network-info.interface';
import { NetworkStatusDto } from './dto/network-status.dto';
import { StarkNetProviderConfigDto } from './dto/provider-config.dto';
import { StarkNetProviderException } from './exceptions/starknet-provider.exception';

@Injectable()
export class StarkNetProviderService implements IStarkNetProviderService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StarkNetProviderService.name);
  
  private providers: Map<string, Provider> = new Map();
  private providerOptions: Map<string, ProviderOptions> = new Map();
  private activeProviderKey: string;
  private currentNetwork: StarkNetNetwork;
  private networkInfo: Map<StarkNetNetwork, NetworkInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // Default configuration
  private config: StarkNetProviderConfigDto = {
    providers: [],
    defaultNetwork: StarkNetNetwork.MAINNET,
    cacheTimeToLive: 60000, // 1 minute
    healthCheckInterval: 60000, // 1 minute
  };

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing StarkNet Provider Service');
    this.loadConfiguration();
    await this.initializeProviders();
    this.startHealthChecks();
  }

  onModuleDestroy() {
    this.logger.log('Stopping StarkNet Provider Service');
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Close all circuit breakers
    for (const breaker of this.circuitBreakers.values()) {
      breaker.shutdown();
    }
  }

  private loadConfiguration() {
    const configFromEnv = this.configService.get<StarkNetProviderConfigDto>('starknet');
    
    if (configFromEnv) {
      this.config = {
        ...this.config,
        ...configFromEnv,
      };
    }

    // If no providers configured, add default sequencer provider
    if (this.config.providers.length === 0) {
      this.logger.warn('No StarkNet providers configured, using default sequencer provider');
      this.config.providers.push({
        type: ProviderType.SEQUENCER,
        network: this.config.defaultNetwork,
        priority: 1,
      } as SequencerProviderOptions);
    }

    this.currentNetwork = this.config.defaultNetwork;
  }

  private async initializeProviders() {
    this.logger.log(`Initializing providers for network: ${this.currentNetwork}`);
    
    // Filter providers for current network and sort by priority
    const networkProviders = this.config.providers
      .filter(p => p.network === this.currentNetwork)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    if (networkProviders.length === 0) {
      throw new StarkNetProviderException(
        `No providers configured for network: ${this.currentNetwork}`,
        'PROVIDER_INIT_ERROR'
      );
    }

    // Initialize each provider
    for (const providerOpts of networkProviders) {
      try {
        const providerKey = this.getProviderKey(providerOpts);
        const provider = this.createProvider(providerOpts);
        this.providers.set(providerKey, provider);
        this.providerOptions.set(providerKey, providerOpts);
        
        // Initialize circuit breaker for this provider
        this.initCircuitBreaker(providerKey, provider, providerOpts);
        
        // Initialize network info
        if (!this.networkInfo.has(providerOpts.network)) {
          this.networkInfo.set(providerOpts.network, {
            id: providerOpts.network,
            name: this.getNetworkName(providerOpts.network),
            chainId: await this.getChainId(provider),
            networkUrl: this.getNetworkUrl(providerOpts),
            explorerUrl: this.getExplorerUrl(providerOpts.network),
            isActive: false,
            isHealthy: false,
            lastCheckedAt: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Failed to initialize provider: ${error.message}`, error.stack);
      }
    }

    // Set the first available provider as active
    if (this.providers.size === 0) {
      throw new StarkNetProviderException(
        'Failed to initialize any providers',
        'PROVIDER_INIT_ERROR'
      );
    }

    this.activeProviderKey = this.providers.keys().next().value;
    const networkInfo = this.networkInfo.get(this.currentNetwork);
    if (networkInfo) {
      networkInfo.isActive = true;
    }
    
    this.logger.log(`Active provider set to: ${this.activeProviderKey}`);
  }

  private createProvider(options: ProviderOptions): Provider {
    switch (options.type) {
      case ProviderType.RPC:
        return new RpcProvider({
          nodeUrl: (options as RpcProviderOptions).nodeUrl,
          headers: (options as RpcProviderOptions).apiKey 
            ? { 'x-api-key': (options as RpcProviderOptions).apiKey } 
            : undefined,
        });
      
      case ProviderType.SEQUENCER:
        const seqOptions = options as SequencerProviderOptions;
        return new SequencerProvider({
          baseUrl: seqOptions.baseUrl || this.getSequencerBaseUrl(options.network),
          feederGatewayUrl: seqOptions.feederGatewayUrl,
          gatewayUrl: seqOptions.gatewayUrl,
        });
      
      case ProviderType.INFURA:
        return new RpcProvider({
          nodeUrl: `https://starknet-${this.getInfuraNetwork(options.network)}.infura.io/v3/${(options as InfuraProviderOptions).apiKey}`,
        });
      
      case ProviderType.ALCHEMY:
        return new RpcProvider({
          nodeUrl: `https://starknet-${this.getAlchemyNetwork(options.network)}.g.alchemy.com/v2/${(options as AlchemyProviderOptions).apiKey}`,
        });
      
      default:
        throw new StarkNetProviderException(
          `Unsupported provider type: ${options.type}`,
          'INVALID_PROVIDER_TYPE'
        );
    }
  }

  private initCircuitBreaker(providerKey: string, provider: Provider, options: ProviderOptions) {
    const breakerOptions = {
      timeout: options.timeout || 30000, // Default 30s timeout
      errorThresholdPercentage: 50, // Open after 50% failures
      resetTimeout: 30000, // Try again after 30s
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 10, // 10 buckets of 6s each
    };

    // Create a circuit breaker for provider calls
    const breaker = new CircuitBreaker(async (method: string, ...args: any[]) => {
      try {
        // @ts-ignore - Dynamic method call on provider
        return await provider[method](...args);
      } catch (error) {
        this.logger.error(`Provider ${providerKey} error: ${error.message}`, error.stack);
        throw new StarkNetProviderException(
          `Provider error: ${error.message}`,
          'PROVIDER_ERROR',
          { providerKey, method, error }
        );
      }
    }, breakerOptions);

    // Set up listeners for circuit breaker events
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker opened for provider: ${providerKey}`);
      this.markProviderUnhealthy(providerKey);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker closed for provider: ${providerKey}`);
      this.checkProviderHealth(providerKey);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker half-open for provider: ${providerKey}`);
    });

    breaker.on('fallback', () => {
      this.logger.warn(`Fallback for provider: ${providerKey}`);
      // Try to switch to a different provider
      this.switchToNextProvider(providerKey);
    });

    this.circuitBreakers.set(providerKey, breaker);
  }

  private async markProviderUnhealthy(providerKey: string) {
    const options = this.providerOptions.get(providerKey);
    if (options && this.networkInfo.has(options.network)) {
      const info = this.networkInfo.get(options.network);
      info.isHealthy = false;
      info.lastCheckedAt = new Date();
    }
    
    // If this was the active provider, switch to the next one
    if (this.activeProviderKey === providerKey) {
      await this.switchToNextProvider(providerKey);
    }
  }

  private switchToNextProvider(currentProviderKey: string) {
    const currentOptions = this.providerOptions.get(currentProviderKey);
    if (!currentOptions) return;
    
    // Get all providers for the current network
    const networkProviders = Array.from(this.providerOptions.entries())
      .filter(([key, options]) => options.network === currentOptions.network && key !== currentProviderKey)
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));
    
    if (networkProviders.length === 0) {
      this.logger.error('No alternative providers available for failover');
      return;
    }
    
    // Switch to the next provider
    const [nextProviderKey] = networkProviders[0];
    this.activeProviderKey = nextProviderKey;
    this.logger.log(`Switched to provider: ${nextProviderKey}`);
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );
  }

  private async performHealthChecks() {
    this.logger.debug('Performing health checks on all providers');
    
    for (const [providerKey, options] of this.providerOptions.entries()) {
      if (options.network === this.currentNetwork) {
        await this.checkProviderHealth(providerKey);
      }
    }
  }

  private async checkProviderHealth(providerKey: string) {
    const breaker = this.circuitBreakers.get(providerKey);
    const options = this.providerOptions.get(providerKey);
    
    if (!breaker || !options) return;
    
    try {
      const start = Date.now();
      // Try to get the latest block as a health check
      await breaker.fire('getBlock', constants.StarknetChainId.SN_MAIN);
      const latency = Date.now() - start;
      
      // Update health status
      if (this.networkInfo.has(options.network)) {
        const info = this.networkInfo.get(options.network);
        info.isHealthy = true;
        info.lastCheckedAt = new Date();
        
        // Update success metrics
        info.successRate = (breaker.stats.successes / (breaker.stats.failures + breaker.stats.successes)) * 100;
        info.latency = latency;
      }
      
      this.logger.debug(`Provider ${providerKey} health check successful (${latency}ms)`);
    } catch (error) {
      this.logger.warn(`Provider ${providerKey} health check failed: ${error.message}`);
      
      // Update health status
      if (this.networkInfo.has(options.network)) {
        const info = this.networkInfo.get(options.network);
        info.isHealthy = false;
        info.lastCheckedAt = new Date();
      }
    }
  }

  // Helper methods for provider initialization
  private getProviderKey(options: ProviderOptions): string {
    switch (options.type) {
      case ProviderType.RPC:
        return `${options.type}:${(options as RpcProviderOptions).nodeUrl}`;
      case ProviderType.SEQUENCER:
        return `${options.type}:${options.network}`;
      case ProviderType.INFURA:
        return `${options.type}:${options.network}`;
      case ProviderType.ALCHEMY:
        return `${options.type}:${options.network}`;
      default:
        return `${options.type}:${options.network}:${Date.now()}`;
    }
  }

  private getSequencerBaseUrl(network: StarkNetNetwork): string {
    switch (network) {
      case StarkNetNetwork.MAINNET:
        return 'https://alpha-mainnet.starknet.io';
      case StarkNetNetwork.TESTNET:
        return 'https://alpha4.starknet.io';
      case StarkNetNetwork.TESTNET2:
        return 'https://alpha4-2.starknet.io';
      case StarkNetNetwork.INTEGRATION:
        return 'https://integration.starknet.io';
      default:
        return 'https://alpha-mainnet.starknet.io';
    }
  }

  private getInfuraNetwork(network: StarkNetNetwork): string {
    switch (network) {
      case StarkNetNetwork.MAINNET:
        return 'mainnet';
      case StarkNetNetwork.TESTNET:
        return 'goerli';
      default:
        return 'mainnet';
    }
  }

  private getAlchemyNetwork(network: StarkNetNetwork): string {
    switch (network) {
      case StarkNetNetwork.MAINNET:
        return 'mainnet';
      case StarkNetNetwork.TESTNET:
        return 'goerli';
      default:
        return 'mainnet';
    }
  }

  private getNetworkName(network: StarkNetNetwork): string {
    switch (network) {
      case StarkNetNetwork.MAINNET:
        return 'StarkNet Mainnet';
      case StarkNetNetwork.TESTNET:
        return 'StarkNet Testnet (Goerli)';
      case StarkNetNetwork.TESTNET2:
        return 'StarkNet Testnet 2';
      case StarkNetNetwork.INTEGRATION:
        return 'StarkNet Integration';
      default:
        return `StarkNet ${network}`;
    }
  }

  private getExplorerUrl(network: StarkNetNetwork): string {
    switch (network) {
      case StarkNetNetwork.MAINNET:
        return 'https://voyager.online';
      case StarkNetNetwork.TESTNET:
        return 'https://goerli.voyager.online';
      case StarkNetNetwork.TESTNET2:
        return 'https://goerli-2.voyager.online';
      case StarkNetNetwork.INTEGRATION:
        return 'https://integration.voyager.online';
      default:
        return 'https://voyager.online';
    }
  }

  private getNetworkUrl(options: ProviderOptions): string {
    switch (options.type) {
      case ProviderType.RPC:
        return (options as RpcProviderOptions).nodeUrl;
      case ProviderType.SEQUENCER:
        return this.getSequencerBaseUrl(options.network);
      case ProviderType.INFURA:
        return `https://starknet-${this.getInfuraNetwork(options.network)}.infura.io`;
      case ProviderType.ALCHEMY:
        return `https://starknet-${this.getAlchemyNetwork(options.network)}.g.alchemy.com`;
      default:
        return '';
    }
  }

  private async getChainId(provider: Provider): Promise<string> {
    try {
      return await provider.getChainId();
    } catch (error) {
      this.logger.error(`Failed to get chain ID: ${error.message}`);
      return 'unknown';
    }
  }

  // Public API implementation
  public getProvider(): Provider {
    return this.providers.get(this.activeProviderKey);
  }

  public async getNetworkStatus(): Promise<NetworkStatusDto> {
    const networkInfo = this.networkInfo.get(this.currentNetwork);
    if (!networkInfo) {
      throw new StarkNetProviderException(
        `No network info available for network: ${this.currentNetwork}`,
        'NETWORK_INFO_UNAVAILABLE'
      );
    }

    // Try to update block height
    try {
      const provider = this.getProvider();
      const block = await provider.getBlock('latest');
      networkInfo.blockHeight = Number(block.block_number);
    } catch (error) {
      this.logger.error(`Failed to update block height: ${error.message}`);
    }

    // Get current provider type
    const currentProvider = this.providerOptions.get(this.activeProviderKey);

    return {
      ...networkInfo,
      currentProvider: currentProvider?.type,
    };
  }

  public async switchNetwork(networkId: StarkNetNetwork): Promise<void> {
    if (networkId === this.currentNetwork) {
      return;
    }

    this.logger.log(`Switching network from ${this.currentNetwork} to ${networkId}`);
    
    // Check if we have providers for this network
    const hasProvidersForNetwork = Array.from(this.providerOptions.values())
      .some(options => options.network === networkId);
    
    if (!hasProvidersForNetwork) {
      throw new StarkNetProviderException(
        `No providers available for network: ${networkId}`,
        'NETWORK_UNAVAILABLE'
      );
    }

    // Update current network
    const oldNetwork = this.currentNetwork;
    this.currentNetwork = networkId;
    
    // Mark old network as inactive
    const oldNetworkInfo = this.networkInfo.get(oldNetwork);
    if (oldNetworkInfo) {
      oldNetworkInfo.isActive = false;
    }
    
    // Find and set new active provider
    const networkProviders = Array.from(this.providerOptions.entries())
      .filter(([, options]) => options.network === networkId)
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));
    
    if (networkProviders.length === 0) {
      throw new StarkNetProviderException(
        `No providers configured for network: ${networkId}`,
        'PROVIDER_UNAVAILABLE'
      );
    }
    
    // Switch to the highest priority provider for this network
    const [newProviderKey] = networkProviders[0];
    this.activeProviderKey = newProviderKey;
    
    // Mark new network as active
    const newNetworkInfo = this.networkInfo.get(networkId);
    if (newNetworkInfo) {
      newNetworkInfo.isActive = true;
    }
    
    this.logger.log(`Network switched to ${networkId} with provider ${newProviderKey}`);
  }

  public async callRPC<T>(method: string, params: any[]): Promise<T> {
    const provider = this.getProvider();
    if (!provider) {
      throw new StarkNetProviderException('No provider available', 'PROVIDER_UNAVAILABLE');
    }

    // Use a cache key that includes the method and params
    const cacheKey = `rpc:${method}:${JSON.stringify(params)}`;
    
    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<T>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const breaker = this.circuitBreakers.get(this.activeProviderKey);
    if (!breaker) {
      throw new StarkNetProviderException('Circuit breaker not found', 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      // For custom RPC calls, we need to use the RPC provider's method
      if (provider instanceof RpcProvider) {
        const result = await breaker.fire('callMethod', method, params);
        
        // Cache the result for cacheable methods
        if (this.isMethodCacheable(method)) {
          await this.cacheManager.set(cacheKey, result, this.config.cacheTimeToLive);
        }
        
        return result;
      } else {
        throw new StarkNetProviderException(
          'Custom RPC calls only supported with RPC provider',
          'UNSUPPORTED_OPERATION'
        );
      }
    } catch (error) {
      // If breaker is open or call fails, try to switch provider and retry
      if (breaker.status === 'open' || breaker.status === 'half-open') {
        await this.switchToNextProvider(this.activeProviderKey);
        return this.callRPC(method, params);
      }
      
      throw new StarkNetProviderException(
        `RPC call failed: ${error.message}`,
        'RPC_CALL_FAILED',
        { method, params, error }
      );
    }
  }

  public async getBlock(blockIdentifier: string | number | BlockTag): Promise<Block> {
    const provider = this.getProvider();
    if (!provider) {
      throw new StarkNetProviderException('No provider available', 'PROVIDER_UNAVAILABLE');
    }

    // Only cache for specific block numbers/hashes, not for 'latest' or similar tags
    const shouldCache = typeof blockIdentifier !== 'string' || 
      (blockIdentifier !== 'latest' && blockIdentifier !== 'pending');
    
    if (shouldCache) {
      const cacheKey = `block:${blockIdentifier}`;
      const cachedBlock = await this.cacheManager.get<Block>(cacheKey);
      if (cachedBlock) {
        return cachedBlock;
      }
    }

    const breaker = this.circuitBreakers.get(this.activeProviderKey);
    if (!breaker) {
      throw new StarkNetProviderException('Circuit breaker not found', 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      const block = await breaker.fire('getBlock', blockIdentifier);
      
      // Cache if it's a specific block
      if (shouldCache) {
        const cacheKey = `block:${blockIdentifier}`;
        await this.cacheManager.set(cacheKey, block, this.config.cacheTimeToLive);
      }
      
      return block;
    } catch (error) {
      // If breaker is open or call fails, try to switch provider and retry
      if (breaker.status === 'open' || breaker.status === 'half-open') {
        await this.switchToNextProvider(this.activeProviderKey);
        return this.getBlock(blockIdentifier);
      }
      
      throw new StarkNetProviderException(
        `Failed to get block: ${error.message}`,
        'GET_BLOCK_FAILED',
        { blockIdentifier, error }
      );
    }
  }

  public async getTransaction(hash: string): Promise<Transaction> {
    const provider = this.getProvider();
    if (!provider) {
      throw new StarkNetProviderException('No provider available', 'PROVIDER_UNAVAILABLE');
    }

    const cacheKey = `tx:${hash}`;
    const cachedTx = await this.cacheManager.get<Transaction>(cacheKey);
    if (cachedTx) {
      return cachedTx;
    }

    const breaker = this.circuitBreakers.get(this.activeProviderKey);
    if (!breaker) {
      throw new StarkNetProviderException('Circuit breaker not found', 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      const tx = await breaker.fire('getTransaction', hash);
      
      // Cache the transaction
      await this.cacheManager.set(cacheKey, tx, this.config.cacheTimeToLive);
      
      return tx;
    } catch (error) {
      // If breaker is open or call fails, try to switch provider and retry
      if (breaker.status === 'open' || breaker.status === 'half-open') {
        await this.switchToNextProvider(this.activeProviderKey);
        return this.getTransaction(hash);
      }
      
      throw new StarkNetProviderException(
        `Failed to get transaction: ${error.message}`,
        'GET_TRANSACTION_FAILED',
        { hash, error }
      );
    }
  }

  public async getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    const provider = this.getProvider();
    if (!provider) {
      throw new StarkNetProviderException('No provider available', 'PROVIDER_UNAVAILABLE');
    }

    const cacheKey = `tx-receipt:${hash}`;
    const cachedReceipt = await this.cacheManager.get<TransactionReceipt>(cacheKey);
    if (cachedReceipt) {
      return cachedReceipt;
    }

    const breaker = this.circuitBreakers.get(this.activeProviderKey);
    if (!breaker) {
      throw new StarkNetProviderException('Circuit breaker not found', 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      const receipt = await breaker.fire('getTransactionReceipt', hash);
      
      // Only cache finalized receipts
      if (receipt.finality_status === 'ACCEPTED_ON_L1' || receipt.finality_status === 'ACCEPTED_ON_L2') {
        await this.cacheManager.set(cacheKey, receipt, this.config.cacheTimeToLive);
      }
      
      return receipt;
    } catch (error) {
      // If breaker is open or call fails, try to switch provider and retry
      if (breaker.status === 'open' || breaker.status === 'half-open') {
        await this.switchToNextProvider(this.activeProviderKey);
        return this.getTransactionReceipt(hash);
      }
      
      throw new StarkNetProviderException(
        `Failed to get transaction receipt: ${error.message}`,
        'GET_RECEIPT_FAILED',
        { hash, error }
      );
    }
  }

  public async estimateFee(
    calls: Call | Call[],
    options?: {
      blockIdentifier?: BlockTag | string | number;
      skipValidate?: boolean;
    }
  ): Promise<EstimateFeeResponse> {
    const provider = this.getProvider();
    if (!provider) {
      throw new StarkNetProviderException('No provider available', 'PROVIDER_UNAVAILABLE');
    }

    const breaker = this.circuitBreakers.get(this.activeProviderKey);
    if (!breaker) {
      throw new StarkNetProviderException('Circuit breaker not found', 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      // Fee estimation is not cached as it can change frequently
      return await breaker.fire('estimateFee', calls, options);
    } catch (error) {
      // If breaker is open or call fails, try to switch provider and retry
      if (breaker.status === 'open' || breaker.status === 'half-open') {
        await this.switchToNextProvider(this.activeProviderKey);
        return this.estimateFee(calls, options);
      }
      
      throw new StarkNetProviderException(
        `Failed to estimate fee: ${error.message}`,
        'ESTIMATE_FEE_FAILED',
        { error }
      );
    }
  }

  // Helper to determine if a method result should be cached
  private isMethodCacheable(method: string): boolean {
    const cacheableMethods = [
      'starknet_getBlockWithTxs',
      'starknet_getBlockWithTxHashes',
      'starknet_getStateUpdate',
      'starknet_getStorageAt',
      'starknet_getClassAt',
      'starknet_getClassHashAt',
      'starknet_getClass',
      'starknet_getEvents',
      'starknet_getNonce',
    ];
    
    return cacheableMethods.includes(method);
  }
}
