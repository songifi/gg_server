// src/modules/starknet/provider/starknet-provider.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Provider, RpcProvider, SequencerProvider, Block, Transaction, Call } from 'starknet';
import { StarkNetProviderService } from './starknet-provider.service';
import { StarkNetNetwork, ProviderType } from './interfaces/provider-options.interface';
import { StarkNetProviderException } from './exceptions/starknet-provider.exception';

// Mock starknet.js
jest.mock('starknet', () => {
  const originalModule = jest.requireActual('starknet');
  return {
    ...originalModule,
    RpcProvider: jest.fn().mockImplementation(() => ({
      getChainId: jest.fn().mockResolvedValue('SN_MAIN'),
      getBlock: jest.fn().mockResolvedValue({
        block_number: 123456,
        block_hash: '0x123456',
        parent_hash: '0x123455',
        status: 'ACCEPTED_ON_L1',
        timestamp: 1634300000,
        sequencer_address: '0x1234',
        transactions: [],
      }),
      getTransaction: jest.fn().mockResolvedValue({
        transaction_hash: '0xabcdef',
        version: 1,
        type: 'INVOKE',
        max_fee: '1000000000000000',
        signature: [],
        nonce: '0x0',
        contract_address: '0x1234',
        entry_point_selector: '0x5678',
        calldata: [],
      }),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        transaction_hash: '0xabcdef',
        status: 'ACCEPTED_ON_L1',
        actual_fee: '500000000000000',
        execution_resources: {
          n_steps: 1000,
          n_memory_holes: 0,
        },
        events: [],
        finality_status: 'ACCEPTED_ON_L1',
      }),
      estimateFee: jest.fn().mockResolvedValue({
        overall_fee: '500000000000000',
        gas_consumed: '500000',
        gas_price: '1000000000',
      }),
      callMethod: jest.fn().mockResolvedValue('mock-rpc-result'),
    })),
    SequencerProvider: jest.fn().mockImplementation(() => ({
      getChainId: jest.fn().mockResolvedValue('SN_MAIN'),
      getBlock: jest.fn().mockResolvedValue({
        block_number: 123456,
        block_hash: '0x123456',
        parent_hash: '0x123455',
        status: 'ACCEPTED_ON_L1',
        timestamp: 1634300000,
        sequencer_address: '0x1234',
        transactions: [],
      }),
      getTransaction: jest.fn().mockResolvedValue({
        transaction_hash: '0xabcdef',
        version: 1,
        type: 'INVOKE',
        max_fee: '1000000000000000',
        signature: [],
        nonce: '0x0',
        contract_address: '0x1234',
        entry_point_selector: '0x5678',
        calldata: [],
      }),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        transaction_hash: '0xabcdef',
        status: 'ACCEPTED_ON_L1',
        actual_fee: '500000000000000',
        execution_resources: {
          n_steps: 1000,
          n_memory_holes: 0,
        },
        events: [],
        finality_status: 'ACCEPTED_ON_L1',
      }),
      estimateFee: jest.fn().mockResolvedValue({
        overall_fee: '500000000000000',
        gas_consumed: '500000',
        gas_price: '1000000000',
      }),
    })),
  };
});

// Mock opossum (Circuit Breaker)
jest.mock('opossum', () => {
  const mockFire = jest.fn().mockImplementation((method, ...args) => {
    if (method === 'getBlock') {
      return {
        block_number: 123456,
        block_hash: '0x123456',
        parent_hash: '0x123455',
        status: 'ACCEPTED_ON_L1',
        timestamp: 1634300000,
        sequencer_address: '0x1234',
        transactions: [],
      };
    } else if (method === 'getTransaction') {
      return {
        transaction_hash: '0xabcdef',
        version: 1,
        type: 'INVOKE',
        max_fee: '1000000000000000',
        signature: [],
        nonce: '0x0',
        contract_address: '0x1234',
        entry_point_selector: '0x5678',
        calldata: [],
      };
    } else if (method === 'getTransactionReceipt') {
      return {
        transaction_hash: '0xabcdef',
        status: 'ACCEPTED_ON_L1',
        actual_fee: '500000000000000',
        execution_resources: {
          n_steps: 1000,
          n_memory_holes: 0,
        },
        events: [],
        finality_status: 'ACCEPTED_ON_L1',
      };
    } else if (method === 'estimateFee') {
      return {
        overall_fee: '500000000000000',
        gas_consumed: '500000',
        gas_price: '1000000000',
      };
    } else if (method === 'callMethod') {
      return 'mock-rpc-result';
    }
    return args[0];
  });

  return jest.fn().mockImplementation(() => ({
    fire: mockFire,
    on: jest.fn(),
    status: 'closed',
    shutdown: jest.fn(),
    stats: {
      successes: 10,
      failures: 0,
    },
  }));
});

describe('StarkNetProviderService', () => {
  let service: StarkNetProviderService;
  let configService: ConfigService;
  let cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'starknet') {
        return {
          providers: [
            {
              type: ProviderType.RPC,
              network: StarkNetNetwork.MAINNET,
              nodeUrl: 'https://starknet-mockrpc.com',
              priority: 1,
            },
            {
              type: ProviderType.SEQUENCER,
              network: StarkNetNetwork.MAINNET,
              priority: 2,
            },
          ],
          defaultNetwork: StarkNetNetwork.MAINNET,
          cacheTimeToLive: 60000,
          healthCheckInterval: 60000,
        };
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarkNetProviderService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<StarkNetProviderService>(StarkNetProviderService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get<any>(CACHE_MANAGER);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProvider', () => {
    it('should return an initialized provider', () => {
      const provider = service.getProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('getNetworkStatus', () => {
    it('should return the current network status', async () => {
      const status = await service.getNetworkStatus();
      expect(status).toBeDefined();
      expect(status.id).toBe(StarkNetNetwork.MAINNET);
      expect(status.isActive).toBe(true);
    });
  });

  describe('switchNetwork', () => {
    it('should switch to a different network', async () => {
      // Mock a provider for testnet in the service
      (service as any).providerOptions.set('sequencer:testnet', {
        type: ProviderType.SEQUENCER,
        network: StarkNetNetwork.TESTNET,
      });
      (service as any).providers.set('sequencer:testnet', new SequencerProvider());
      (service as any).networkInfo.set(StarkNetNetwork.TESTNET, {
        id: StarkNetNetwork.TESTNET,
        name: 'StarkNet Testnet (Goerli)',
        chainId: 'SN_GOERLI',
        networkUrl: 'https://alpha4.starknet.io',
        explorerUrl: 'https://goerli.voyager.online',
        isActive: false,
        isHealthy: true,
        lastCheckedAt: new Date(),
      });
      (service as any).circuitBreakers.set('sequencer:testnet', {
        fire: jest.fn(),
        on: jest.fn(),
        status: 'closed',
        shutdown: jest.fn(),
      });

      await service.switchNetwork(StarkNetNetwork.TESTNET);
      
      const status = await service.getNetworkStatus();
      expect(status.id).toBe(StarkNetNetwork.TESTNET);
      expect(status.isActive).toBe(true);
    });

    it('should throw an error if network is not available', async () => {
      await expect(service.switchNetwork(StarkNetNetwork.INTEGRATION))
        .rejects
        .toThrow(StarkNetProviderException);
    });
  });

  describe('callRPC', () => {
    it('should make a raw RPC call and cache the result', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.callRPC('starknet_getBlockWithTxs', [123]);
      
      expect(result).toBe('mock-rpc-result');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      mockCacheManager.get.mockResolvedValue('cached-result');

      const result = await service.callRPC('starknet_getBlockWithTxs', [123]);
      
      expect(result).toBe('cached-result');
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getBlock', () => {
    it('should get block data and cache it', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const block = await service.getBlock(123456);
      
      expect(block).toBeDefined();
      expect(block.block_number).toBe(123456);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached block if available', async () => {
      const cachedBlock = {
        block_number: 123456,
        block_hash: '0xcached',
      };
      mockCacheManager.get.mockResolvedValue(cachedBlock);

      const block = await service.getBlock(123456);
      
      expect(block).toBe(cachedBlock);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getTransaction', () => {
    it('should get transaction data and cache it', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const tx = await service.getTransaction('0xabcdef');
      
      expect(tx).toBeDefined();
      expect(tx.transaction_hash).toBe('0xabcdef');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getTransactionReceipt', () => {
    it('should get transaction receipt and cache it if finalized', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const receipt = await service.getTransactionReceipt('0xabcdef');
      
      expect(receipt).toBeDefined();
      expect(receipt.transaction_hash).toBe('0xabcdef');
      expect(receipt.finality_status).toBe('ACCEPTED_ON_L1');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('estimateFee', () => {
    it('should estimate fee for a transaction', async () => {
      const call: Call = {
        contractAddress: '0x1234',
        entrypoint: 'transfer',
        calldata: ['0x5678', '1000'],
      };

      const fee = await service.estimateFee(call);
      
      expect(fee).toBeDefined();
      expect(fee.overall_fee).toBe('500000000000000');
    });
  });
});
