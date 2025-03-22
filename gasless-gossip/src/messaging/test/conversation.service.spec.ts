import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationService } from '../services/conversation.service';
import { Conversation, ConversationDocument } from '../schemas/conversation.schema';
import { Message, MessageDocument } from '../schemas/message.schema';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let conversationModel: Model<ConversationDocument>;
  let messageModel: Model<MessageDocument>;

  const mockUserId = new Types.ObjectId().toString();
  const mockParticipantId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();
  const mockMessageId = new Types.ObjectId().toString();

  const mockConversation = {
    _id: mockConversationId,
    participants: [mockUserId, mockParticipantId],
    lastMessage: mockMessageId,
    save: jest.fn().mockResolvedValue({ _id: mockConversationId }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockConversation),
            constructor: jest.fn().mockResolvedValue(mockConversation),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(Message.name),
          useValue: {
            new: jest.fn(),
            constructor: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    conversationService = module.get<ConversationService>(ConversationService);
    conversationModel = module.get<Model<ConversationDocument>>(getModelToken(Conversation.name));
    messageModel = module.get<Model<MessageDocument>>(getModelToken(Message.name));
  });

  it('should be defined', () => {
    expect(conversationService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new conversation with initial message', async () => {
      const createConversationDto = {
        participantIds: [mockParticipantId],
        initialMessage: 'Hello',
      };

      jest.spyOn(conversationModel, 'save').mockResolvedValue(mockConversation as any);
      jest.spyOn(messageModel, 'save').mockResolvedValue({ _id: mockMessageId } as any);

      const result = await conversationService.create(mockUserId, createConversationDto);

      expect(result).toEqual(mockConversation);
    });
  });

  // Add more test cases for other methods
});
