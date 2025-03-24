// File: src/modules/transfers/test/token-transfer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { TokenTransferService } from '../services/token-transfer.service';
import { FeeEstimationService } from '../services/fee-estimation.service';
import { TransactionStatusService } from '../services/transaction-status.service';
import { StarknetProvider } from '../../blockchain/services/starknet-provider.service';
import { UserService } from '../../user/services/user.service';
import { ConversationService } from '../../conversation/services/conversation.service';
import { MessageService } from '../../messaging/services/message.service';
import { Transaction } from '../entities/transaction.entity';
import { TokenType } from '../interfaces/token-type.enum';
import { TransactionStatus } from '../interfaces/transaction-status.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TokenTransferService', () => {
  let service: TokenTransferService;
  let feeEstimationService: FeeEstimationService;
  let transactionStatusService: TransactionStatusService;
  let starknetProvider: StarknetProvider;
  let userService: UserService;
  let conversationService: ConversationService;
  let messageService: MessageService;
  let transactionModel: any;

  const mockUser = {
    _id: '60d21b4667d0d8992e610c85',
    walletAddress: '0x1234567890',
  };

  const mockRecipient = {
    _id: '60d21b4667d0d8992e610c86',
    walletAddress: '0x0987654321',
  };

  const mockTransaction = {
    _id: '60d21b4667d0d8992e610c87',
    senderId: mockUser._id,
    recipientId: mockRecipient._id,
    conversationId: '60d21b4667d0d8992e610c88',
    messageId: '60d21b4667d0d8992e610c89',
    tokenType: TokenType.ETH,
    amount: '1000000000000000000',
    txHash: '0x1234',
    status: TransactionStatus.PENDING,
    statusUpdatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenTransferService,
        {
          provide: FeeEstimationService,
          useValue: {
            estimateFee: jest.fn(),
          },
        },
        {
          provide: TransactionStatusService,
          useValue: {
            trackTransaction: jest.fn(),
            getTransactionStatus: jest.fn(),
            getUserTransactionHistory: jest.fn(),
            getConversationTransactionHistory: jest.fn(),
          },
        },
        {
          provide: StarknetProvider,
          useValue: {
            submitTransaction: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            validateParticipation: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: {
            findById: jest.fn(),
            attachTransfer: jest.fn(),
          },
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockTransaction),
            constructor: jest.fn().mockResolvedValue(mockTransaction),
            find: jest.fn(),
            findOne: jest.fn(),
            exec: jest.fn(),
            populate: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://voyager.online/tx/'),
          },
        },
      ],
    }).compile();

    service = module.get<TokenTransferService>(TokenTransferService);
    feeEstimationService = module.get<FeeEstimationService>(FeeEstimationService);
    transactionStatusService = module.get<TransactionStatusService>(TransactionStatusService);
    starknetProvider = module.get<StarknetProvider>(StarknetProvider);
    userService = module.get<UserService>(UserService);
    conversationService = module.get<ConversationService>(ConversationService);
    messageService = module.get<MessageService>(MessageService);
    transactionModel = module.get(getModelToken(Transaction.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateTransfer', () => {
    it('should successfully initiate a transfer', async () => {
      const transferDto = {
        recipientId: mockRecipient._id,
        conversationId: '60d21b4667d0d8992e610c88',
        messageId: '60d21b4667d0d8992e610c89',
        tokenType: TokenType.ETH,
        amount: '1000000000000000000',
      };

      // Setup mocks
      jest.spyOn(userService, 'findById').mockImplementation((id) => {
        if (id === mockUser._id) return Promise.resolve(mockUser as any);
        if (id === mockRecipient._id) return Promise.resolve(mockRecipient as any);
        return Promise.resolve(null);
      });

      jest.spyOn(conversationService, 'validateParticipation').mockResolvedValue(undefined);
      jest.spyOn(messageService, 'findById').mockResolvedValue({
        _id: transferDto.messageId,
        conversationId: transferDto.conversationId,
      } as any);

      jest.spyOn(starknetProvider, 'submitTransaction').mockResolvedValue({
        transaction_hash: '0x1234',
      });

      jest.spyOn(transactionStatusService, 'trackTransaction').mockResolvedValue(mockTransaction as any);

      const result = await service.initiateTransfer(mockUser._id, transferDto);

      expect(result).toEqual(mockTransaction);
      expect(starknetProvider.submitTransaction).toHaveBeenCalled();
      expect(transactionStatusService.trackTransaction).toHaveBeenCalled();
    });

    it('should throw if user does not have a wallet', async () => {
      const transferDto = {
        recipientId: mockRecipient._id,
        conversationId: '60d21b4667d0d8992e610c88',
        tokenType: TokenType.ETH,
        amount: '1000000000000000000',
      };

      // User without wallet
      jest.spyOn(userService, 'findById').mockResolvedValue({
        _id: mockUser._id,
        // No walletAddress
      } as any);

      await expect(service.initiateTransfer(mockUser._id, transferDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if recipient does not exist', async () => {
      const transferDto = {
        recipientId: 'non-existent-id',
        conversationId: '60d21b4667d0d8992e610c88',
        tokenType: TokenType.ETH,
        amount: '1000000000000000000',
      };

      jest.spyOn(userService, 'findById').mockImplementation((id) => {
        if (id === mockUser._id) return Promise.resolve(mockUser as any);
        return Promise.resolve(null);
      });

      await expect(service.initiateTransfer(mockUser._id, transferDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('estimateTransferFee', () => {
    it('should return fee estimation', async () => {
      const feeRequestDto = {
        tokenType: TokenType.ETH,
        amount: '1000000000000000000',
      };

      const mockEstimate = {
        estimatedFee: '12500000000000',
        gasUsage: '25000',
        gasPrice: '500000000',
      };

      jest.spyOn(feeEstimationService, 'estimateFee').mockResolvedValue(mockEstimate);

      const result = await service.estimateTransferFee(feeRequestDto);

      expect(result).toEqual(mockEstimate);
      expect(feeEstimationService.estimateFee).toHaveBeenCalledWith(feeRequestDto);
    });
  });

  describe('getTransferStatus', () => {
    it('should return transaction status', async () => {
      const txHash = '0x1234';

      jest.spyOn(transactionStatusService, 'getTransactionStatus').mockResolvedValue(mockTransaction as any);

      const result = await service.getTransferStatus(txHash);

      expect(result).toEqual(mockTransaction);
      expect(transactionStatusService.getTransactionStatus).toHaveBeenCalledWith(txHash);
    });
  });

  // Add more tests for other methods...
});
