import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { Message, MessageDocument, MessageStatus } from '../schemas/message.schema';
import { Conversation, ConversationDocument } from '../schemas/conversation.schema';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MessageService', () => {
  let messageService: MessageService;
  let conversationService: ConversationService;
  let messageModel: Model<MessageDocument>;

  const mockUserId = new Types.ObjectId().toString();
  const mockRecipientId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();
  const mockMessageId = new Types.ObjectId().toString();

  const mockMessage = {
    _id: mockMessageId,
    sender: mockUserId,
    recipient: mockRecipientId,
    conversation: mockConversationId,
    content: 'Test message',
    status: MessageStatus.SENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversation = {
    _id: mockConversationId,
    participants: [mockUserId, mockRecipientId],
    lastMessage: mockMessageId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: ConversationService,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            updateLastMessage: jest.fn(),
          },
        },
        {
          provide: getModelToken(Message.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockMessage),
            constructor: jest.fn().mockResolvedValue(mockMessage),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    messageService = module.get<MessageService>(MessageService);
    conversationService = module.get<ConversationService>(ConversationService);
    messageModel = module.get<Model<MessageDocument>>(getModelToken(Message.name));
  });

  it('should be defined', () => {
    expect(messageService).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should send a message to an existing conversation', async () => {
      const createMessageDto = {
        conversationId: mockConversationId,
        recipientId: mockRecipientId,
        content: 'Test message',
      };

      jest.spyOn(conversationService, 'findById').mockResolvedValue(mockConversation as any);
      jest.spyOn(messageModel, 'save').mockResolvedValue(mockMessage as any);
      jest.spyOn(conversationService, 'updateLastMessage').mockResolvedValue(undefined);

      const result = await messageService.sendMessage(mockUserId, createMessageDto);

      expect(conversationService.findById).toHaveBeenCalledWith(mockConversationId);
      expect(conversationService.updateLastMessage).toHaveBeenCalledWith(
        mockConversationId,
        expect.any(String),
      );
      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const createMessageDto = {
        conversationId: mockConversationId,
        recipientId: mockRecipientId,
        content: 'Test message',
      };

      jest.spyOn(conversationService, 'findById').mockResolvedValue(null);

      await expect(messageService.sendMessage(mockUserId, createMessageDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // Add more test cases for other methods
});
