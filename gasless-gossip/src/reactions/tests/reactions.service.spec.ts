import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReactionsService } from '../reactions.service';
import { CreateReactionDto } from '../dto/create-reaction.dto';
import { RemoveReactionDto } from '../dto/remove-reaction.dto';
import { ReactionType } from '../enums/reaction-type.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ReactionsService', () => {
  let service: ReactionsService;
  
  // Mock models
  const mockReactionModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      _id: 'test-reaction-id',
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-reaction-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-reaction-id',
        }),
      }),
    })),
  };
  
  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        {
          provide: getModelToken('MessageReaction'),
          useValue: mockReactionModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addReaction', () => {
    it('should add a new reaction', async () => {
      // Mock no existing reaction
      mockReactionModel.findOne.mockResolvedValue(null);
      
      const createReactionDto: CreateReactionDto = {
        messageId: 'test-message-id',
        type: ReactionType.EMOJI,
        content: '👍',
      };
      
      const result = await service.addReaction('test-user-id', createReactionDto);
      
      expect(mockReactionModel.findOne).toHaveBeenCalledWith({
        messageId: 'test-message-id',
        userId: 'test-user-id',
        content: '👍',
      });
      
      expect(mockReactionModel.new).toHaveBeenCalledWith({
        messageId: 'test-message-id',
        userId: 'test-user-id',
        conversationId: 'test-conversation',
        type: ReactionType.EMOJI,
        content: '👍',
      });
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reaction.added',
        expect.objectContaining({
          messageId: 'test-message-id',
          userId: 'test-user-id',
          content: '👍',
        })
      );
      
      expect(result).toBeDefined();
      expect(result.messageId).toEqual('test-message-id');
      expect(result.content).toEqual('👍');
    });
    
    it('should return existing reaction if already exists', async () => {
      // Mock existing reaction
      const existingReaction = {
        _id: 'existing-reaction-id',
        messageId: 'test-message-id',
        userId: 'test-user-id',
        conversationId: 'test-conversation',
        type: ReactionType.EMOJI,
        content: '👍',
        toObject: jest.fn().mockReturnValue({
          id: 'existing-reaction-id',
          messageId: 'test-message-id',
          userId: 'test-user-id',
          content: '👍',
        }),
      };
      
      mockReactionModel.findOne.mockResolvedValue(existingReaction);
      
      const createReactionDto: CreateReactionDto = {
        messageId: 'test-message-id',
        type: ReactionType.EMOJI,
        content: '👍',
      };
      
      const result = await service.addReaction('test-user-id', createReactionDto);
      
      expect(mockReactionModel.new).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      
      expect(result).toBeDefined();
      expect(result.id).toEqual('existing-reaction-id');
    });
    
    it('should reject invalid emoji reactions', async () => {
      const createReactionDto: CreateReactionDto = {
        messageId: 'test-message-id',
        type: ReactionType.EMOJI,
        content: '🤚🏻', // Not in allowed list
      };
      
      await expect(service.addReaction('test-user-id', createReactionDto))
        .rejects.toThrow(BadRequestException);
    });
  });
  
  describe('removeReaction', () => {
    it('should remove an existing reaction', async () => {
      // Mock existing reaction
      const existingReaction = {
        _id: 'existing-reaction-id',
        messageId: 'test-message-id',
        userId: 'test-user-id',
        conversationId: 'test-conversation',
        content: '👍',
      };
      
      mockReactionModel.findOne.mockResolvedValue(existingReaction);
      mockReactionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      const removeReactionDto: RemoveReactionDto = {
        messageId: 'test-message-id',
        content: '👍',
      };
      
      await service.removeReaction('test-user-id', removeReactionDto);
      
      expect(mockReactionModel.findOne).toHaveBeenCalledWith({
        messageId: 'test-message-id',
        content: '👍',
        userId: 'test-user-id',
      });
      
      expect(mockReactionModel.deleteOne).toHaveBeenCalledWith({
        _id: 'existing-reaction-id',
      });
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reaction.removed',
        expect.objectContaining({
          messageId: 'test-message-id',
          userId: 'test-user-id',
          content: '👍',
        })
      );
    });
    
    it('should throw NotFoundException if reaction does not exist', async () => {
      mockReactionModel.findOne.mockResolvedValue(null);
      
      const removeReactionDto: RemoveReactionDto = {
        messageId: 'test-message-id',
        content: '👍',
      };
      
      await expect(service.removeReaction('test-user-id', removeReactionDto))
        .rejects.toThrow(NotFoundException);
      
      expect(mockReactionModel.deleteOne).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
  
  describe('getMessageReactions', () => {
    it('should return grouped reactions for a message', async () => {
      // Mock reactions
      const reactions = [
        {
          _id: 'reaction-1',
          messageId: 'test-message-id',
          userId: 'user-1',
          content: '👍',
          type: ReactionType.EMOJI,
          toObject: () => ({
            id: 'reaction-1',
            messageId: 'test-message-id',
            userId: 'user-1',
            content: '👍',
            type: ReactionType.EMOJI,
          }),
        },
        {
          _id: 'reaction-2',
          messageId: 'test-message-id',
          userId: 'user-2',
          content: '👍',
          type: ReactionType.EMOJI,
          toObject: () => ({
            id: 'reaction-2',
            messageId: 'test-message-id',
            userId: 'user-2',
            content: '👍',
            type: ReactionType.EMOJI,
          }),
        },
        {
          _id: 'reaction-3',
          messageId: 'test-message-id',
          userId: 'user-3',
          content: '❤️',
          type: ReactionType.EMOJI,
          toObject: () => ({
            id: 'reaction-3',
            messageId: 'test-message-id',
            userId: 'user-3',
            content: '❤️',
            type: ReactionType.EMOJI,
          }),
        },
      ];
      
      mockReactionModel.find.mockResolvedValue(reactions);
      
      const result = await service.getMessageReactions('test-message-id');
      
      expect(mockReactionModel.find).toHaveBeenCalledWith({
        messageId: 'test-message-id',
      });
      
      expect(result).toBeDefined();
      expect(result.messageId).toEqual('test-message-id');
      expect(result.totalReactions).toEqual(3);
      expect(result.summary).toHaveLength(2); // 2 unique reactions
      
      // Check the order (most frequent first)
      expect(result.summary[0].content).toEqual('👍');
      expect(result.summary[0].count).toEqual(2);
      expect(result.summary[0].userIds).toEqual(['user-1', 'user-2']);
      
      expect(result.summary[1].content).toEqual('❤️');
      expect(result.summary[1].count).toEqual(1);
      expect(result.summary[1].userIds).toEqual(['user-3']);
    });
    
    it('should include full reaction details when requested', async () => {
      // Mock reactions
      const reactions = [
        {
          _id: 'reaction-1',
          messageId: 'test-message-id',
          userId: 'user-1',
          content: '👍',
          type: ReactionType.EMOJI,
          toObject: () => ({
            id: 'reaction-1',
            messageId: 'test-message-id',
            userId: 'user-1',
            content: '👍',
            type: ReactionType.EMOJI,
          }),
        },
      ];
      
      mockReactionModel.find.mockResolvedValue(reactions);
      
      const result = await service.getMessageReactions('test-message-id', true);
      
      expect(result.reactions).toBeDefined();
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0].id).toEqual('reaction-1');
    });
  });
  
  // Additional test cases for other methods...
});