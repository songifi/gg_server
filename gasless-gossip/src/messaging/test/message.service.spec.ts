// File: src/modules/messaging/test/message.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../../conversation/services/conversation.service';
import { UserService } from '../../user/services/user.service';
import { Message, MessageType, MessageStatus } from '../schemas/message.schema';
import { Conversation, ConversationType, MemberRole } from '../../conversation/schemas/conversation.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

describe('MessageService', () => {
  let service: MessageService;
  let messageModel: Model<Message>;
  let conversationModel: Model<Conversation>;
  let conversationService: ConversationService;
  let userService: UserService;
  let eventEmitter: EventEmitter2;

  const mockUserId = new Types.ObjectId().toString();
  const mockOtherUserId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();
  const mockGroupId = new Types.ObjectId().toString();
  const mockMessageId = new Types.ObjectId().toString();

  const mockGroupConversation = {
    _id: mockGroupId,
    type: ConversationType.GROUP,
    isAnnouncementGroup: false,
    canMembersSendMessages: true,
    members: [
      {
        userId: new Types.ObjectId(mockUserId),
        role: MemberRole.ADMIN,
        unreadCount: 0,
        hasLeft: false,
      },
      {
        userId: new Types.ObjectId(mockOtherUserId),
        role: MemberRole.MEMBER,
        unreadCount: 0,
        hasLeft: false,
      },
    ],
    createdBy: new Types.ObjectId(mockUserId),
    save: jest.fn(),
  };

  const mockMessage = {
    _id: mockMessageId,
    senderId: { _id: mockUserId, name: 'Test User' },
    conversationId: mockConversationId,
    groupId: mockGroupId,
    content: 'Test message',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    readReceipts: [],
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Message.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockMessage),
            constructor: jest.fn().mockResolvedValue(mockMessage),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            updateOne: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            updateLastMessage: jest.fn(),
            resetUnreadCount: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageModel = module.get<Model<Message>>(getModelToken(Message.name));
    conversationModel = module.get<Model<Conversation>>(getModelToken(Conversation.name));
    conversationService = module.get<ConversationService>(ConversationService);
    userService = module.get<UserService>(UserService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMessage in a group', () => {
    it('should create a message in a group conversation', async () => {
      const createMessageDto = {
        conversationId: mockGroupId,
        groupId: mockGroupId,
        content: 'Hello group!',
      };

      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      } as any);

      jest.spyOn(mockMessage, 'save').mockResolvedValue(mockMessage);

      jest.spyOn(messageModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessage),
      } as any);

      const result = await service.createMessage(mockUserId, createMessageDto);

      expect(conversationService.updateLastMessage).toHaveBeenCalledWith(
        mockGroupId,
        mockMessageId,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'message.group.created',
        expect.anything(),
      );
      expect(result).toEqual(mockMessage);
    });

    it('should throw ForbiddenException if user is not a member of the group', async () => {
      const nonMemberUserId = new Types.ObjectId().toString();
      const createMessageDto = {
        conversationId: mockGroupId,
        groupId: mockGroupId,
        content: 'Hello group!',
      };

      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      } as any);

      await expect(service.createMessage(nonMemberUserId, createMessageDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if announcement but user is not admin', async () => {
      const createMessageDto = {
        conversationId: mockGroupId,
        groupId: mockGroupId,
        content: 'Announcement!',
        type: MessageType.ANNOUNCEMENT,
      };

      const nonAdminUserId = mockOtherUserId;

      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      } as any);

      await expect(service.createMessage(nonAdminUserId, createMessageDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('pinMessage', () => {
    it('should pin a message', async () => {
      const pinMessageDto = {
        isPinned: true,
      };

      jest.spyOn(messageModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          isPinned: false,
          save: jest.fn().mockResolvedValue({
            ...mockMessage,
            isPinned: true,
            pinnedBy: new Types.ObjectId(mockUserId),
            pinnedAt: expect.any(Date),
          }),
        }),
      } as any);

      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockGroupConversation,
          pinnedMessages: [],
        }),
      } as any);

      const result = await service.pinMessage(mockUserId, mockMessageId, pinMessageDto);

      expect(result.isPinned).toBe(true);
      expect(result.pinnedBy).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'message.pinned',
        expect.anything(),
      );
    });

    it('should throw ForbiddenException if user does not have pin permission', async () => {
      const pinMessageDto = {
        isPinned: true,
      };

      const regularMemberUserId = mockOtherUserId;

      jest.spyOn(messageModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMessage),
      } as any);

      jest.spyOn(conversationModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockGroupConversation,
          members: [
            {
              userId: new Types.ObjectId(regularMemberUserId),
              role: MemberRole.MEMBER,
              unreadCount: 0,
              hasLeft: false,
            },
          ],
        }),
      } as any);

      await expect(service.pinMessage(regularMemberUserId, mockMessageId, pinMessageDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // Add more test cases for other methods...
});
