import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationService } from '../services/conversation.service';
import { Conversation, ConversationDocument } from '../schemas/conversation.schema';
import { UserService } from '../../user/services/user.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let conversationModel: Model<ConversationDocument>;
  let userService: UserService;

  const mockUserId = new Types.ObjectId().toString();
  const mockRecipientId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();

  const mockConversation = {
    _id: mockConversationId,
    title: 'Test Conversation',
    isGroup: true,
    participants: [
      {
        userId: mockUserId,
        unreadCount: 0,
        hasLeft: false,
        joinedAt: new Date(),
      },
      {
        userId: mockRecipientId,
        unreadCount: 1,
        hasLeft: false,
        joinedAt: new Date(),
      },
    ],
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
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
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    conversationService = module.get<ConversationService>(ConversationService);
    conversationModel = module.get<Model<ConversationDocument>>(getModelToken(Conversation.name));
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(conversationService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new group conversation', async () => {
      const createConversationDto = {
        title: 'Test Group',
        isGroup: true,
        participantIds: [mockRecipientId],
      };

      jest.spyOn(userService, 'findByIds').mockResolvedValue([{ _id: mockUserId }, { _id: mockRecipientId }] as any);
      jest.spyOn(conversationModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(mockConversation, 'save').mockResolvedValue(mockConversation);

      const result = await conversationService.create(mockUserId, createConversationDto);
      expect(result).toEqual(mockConversation);
    });

    it('should throw BadRequestException for group conversation without title', async () => {
      const createConversationDto = {
        isGroup: true,
        participantIds: [mockRecipientId],
      };

      await expect(conversationService.create(mockUserId, createConversationDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('should return a conversation by ID', async () => {
      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockConversation),
          }),
        }),
      } as any);

      const result = await conversationService.findById(mockConversationId, mockUserId);
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      } as any);

      await expect(conversationService.findById(mockConversationId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const nonParticipantId = new Types.ObjectId().toString();
      
      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockConversation),
          }),
        }),
      } as any);

      await expect(conversationService.findById(mockConversationId, nonParticipantId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // Add more tests for other methods
});
