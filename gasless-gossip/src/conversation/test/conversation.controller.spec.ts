import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from '../controllers/conversation.controller';
import { ConversationService } from '../services/conversation.service';
import { Types } from 'mongoose';
import { CreateConversationDto } from '../dto/create-conversation.dto';

describe('ConversationController', () => {
  let conversationController: ConversationController;
  let conversationService: ConversationService;

  const mockUserId = new Types.ObjectId().toString();
  const mockRecipientId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();

  const mockConversation = {
    _id: mockConversationId,
    title: 'Test Conversation',
    isGroup: true,
    participants: [
      {
        userId: { _id: mockUserId, name: 'User 1' },
        unreadCount: 0,
        hasLeft: false,
        joinedAt: new Date(),
      },
      {
        userId: { _id: mockRecipientId, name: 'User 2' },
        unreadCount: 1,
        hasLeft: false,
        joinedAt: new Date(),
      },
    ],
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        {
          provide: ConversationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            addParticipants: jest.fn(),
            removeParticipant: jest.fn(),
            markAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    conversationController = module.get<ConversationController>(ConversationController);
    conversationService = module.get<ConversationService>(ConversationService);
  });

  it('should be defined', () => {
    expect(conversationController).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create and return a conversation', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'Test Conversation',
        isGroup: true,
        participantIds: [mockRecipientId],
      };

      jest.spyOn(conversationService, 'create').mockResolvedValue(mockConversation as any);

      const result = await conversationController.createConversation(mockUserId, createConversationDto);
      
      expect(conversationService.create).toHaveBeenCalledWith(mockUserId, createConversationDto);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockConversationId);
    });
  });

  describe('getConversations', () => {
    it('should return an array of conversations', async () => {
      const paginationDto = { page: 1, limit: 10 };
      
      jest.spyOn(conversationService, 'findAll').mockResolvedValue({
        conversations: [mockConversation] as any,
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await conversationController.getConversations(mockUserId, paginationDto);
      
      expect(conversationService.findAll).toHaveBeenCalledWith(mockUserId, paginationDto);
      expect(result.conversations).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // Add more tests for other methods
});
