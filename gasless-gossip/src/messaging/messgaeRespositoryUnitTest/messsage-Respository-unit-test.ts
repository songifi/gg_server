import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import { MessageDocument, MessageSchema } from '../schemas/message.schema';
import { MessageStatus } from '../enums/message-status.enum';
import { MessageType } from '../enums/message-type.enum';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
import { MessageRepository } from '../messageRepository/message.Respository';

describe('MessageRepository', () => {
  let messageRepository: MessageRepository;
  let messageModel: Model<MessageDocument>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const mongoose = await connect(uri);
    mongoConnection = mongoose.connection;

    // Set up the test module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageRepository,
        {
          provide: getModelToken(MessageDocument.name),
          useValue: mongoConnection.model(MessageDocument.name, MessageSchema),
        },
      ],
    }).compile();

    messageRepository = module.get<MessageRepository>(MessageRepository);
    messageModel = module.get<Model<MessageDocument>>(getModelToken(MessageDocument.name));
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await messageModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a new message', async () => {
      // Arrange
      const createDto: CreateMessageDto = {
        conversationId: 'conv123',
        content: 'Hello world!',
        type: MessageType.TEXT,
      };
      const senderId = 'user123';

      // Act
      const result = await messageRepository.create(createDto, senderId);

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.conversationId).toBe(createDto.conversationId);
      expect(result.content).toBe(createDto.content);
      expect(result.sender).toBe(senderId);
      expect(result.status).toBe(MessageStatus.SENT);
      expect(result.readBy).toEqual([]);
      expect(result.reactions).toEqual([]);
    });
  });

  describe('findByConversation', () => {
    beforeEach(async () => {
      // Seed test data
      const messages = [
        {
          conversationId: 'conv123',
          sender: 'user123',
          content: 'Message 1',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: new Date('2025-03-10T10:00:00Z'),
        },
        {
          conversationId: 'conv123',
          sender: 'user456',
          content: 'Message 2',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: new Date('2025-03-10T11:00:00Z'),
        },
        {
          conversationId: 'conv123',
          sender: 'user123',
          content: 'Message 3',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: new Date('2025-03-10T12:00:00Z'),
        },
        {
          conversationId: 'conv456',
          sender: 'user123',
          content: 'Message in other conversation',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: new Date('2025-03-10T12:00:00Z'),
        },
      ];

      await messageModel.insertMany(messages);
    });

    it('should find messages by conversation ID', async () => {
      // Act
      const results = await messageRepository.findByConversation('conv123');

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Message 3'); // Most recent first
      expect(results[1].content).toBe('Message 2');
      expect(results[2].content).toBe('Message 1');
    });

    it('should respect the limit parameter', async () => {
      // Act
      const results = await messageRepository.findByConversation('conv123', { limit: 2 });

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Message 3');
      expect(results[1].content).toBe('Message 2');
    });

    it('should respect the before parameter', async () => {
      // Act
      const results = await messageRepository.findByConversation('conv123', {
        before: '2025-03-10T11:30:00Z',
      });

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Message 2');
      expect(results[1].content).toBe('Message 1');
    });

    it('should respect the after parameter', async () => {
      // Act
      const results = await messageRepository.findByConversation('conv123', {
        after: '2025-03-10T10:30:00Z',
      });

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Message 3');
      expect(results[1].content).toBe('Message 2');
    });
  });

  describe('updateStatus', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a test message
      const message = (await messageModel.create({
        conversationId: 'conv123',
        sender: 'user123',
        content: 'Test message',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        readBy: [],
      })) as MessageDocument;
      messageId = (message._id as unknown as string).toString();
    });

    it('should update message status to DELIVERED', async () => {
      // Arrange
      const updateDto: UpdateMessageStatusDto = {
        messageId,
        status: MessageStatus.DELIVERED,
        deliveredAt: '2025-03-10T12:00:00Z',
      };
      const userId = 'user456';

      // Act
      const result = await messageRepository.updateStatus(updateDto, userId);

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.status).toBe(MessageStatus.DELIVERED);
      expect(result.deliveredAt).toEqual(new Date('2025-03-10T12:00:00Z'));
    });

    it('should update message status to READ and add user to readBy', async () => {
      // Arrange
      const updateDto: UpdateMessageStatusDto = {
        messageId,
        status: MessageStatus.READ,
        readAt: '2025-03-10T12:00:00Z',
      };
      const userId = 'user456';

      // Act
      const result = await messageRepository.updateStatus(updateDto, userId);

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.status).toBe(MessageStatus.READ);
      expect(result.readAt).toEqual(new Date('2025-03-10T12:00:00Z'));
      expect(result.readBy).toContain(userId);
    });
  });

  describe('addReaction', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a test message
      const message = (await messageModel.create({
        conversationId: 'conv123',
        sender: 'user123',
        content: 'Test message',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        reactions: [],
      })) as MessageDocument;
      messageId = (message._id as unknown as string).toString();
    });

    it('should add a reaction to a message', async () => {
      // Act
      const result = await messageRepository.addReaction(messageId, 'user456', '👍');

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0].userId).toBe('user456');
      expect(result.reactions[0].emoji).toBe('👍');
    });

    it('should replace an existing reaction from the same user', async () => {
      // Arrange
      await messageRepository.addReaction(messageId, 'user456', '👍');

      // Act
      const result = await messageRepository.addReaction(messageId, 'user456', '❤️');

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0].userId).toBe('user456');
      expect(result.reactions[0].emoji).toBe('❤️');
    });
  });

  describe('findByMention', () => {
    beforeEach(async () => {
      // Seed test data
      const messages = [
        {
          conversationId: 'conv123',
          sender: 'user123',
          content: 'Hey @user456',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          mentions: ['user456'],
          createdAt: new Date('2025-03-10T10:00:00Z'),
        },
        {
          conversationId: 'conv789',
          sender: 'user789',
          content: 'Hello @user456 and @user123',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          mentions: ['user456', 'user123'],
          createdAt: new Date('2025-03-10T11:00:00Z'),
        },
        {
          conversationId: 'conv123',
          sender: 'user123',
          content: 'No mentions here',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          mentions: [],
          createdAt: new Date('2025-03-10T12:00:00Z'),
        },
      ];

      await messageModel.insertMany(messages);
    });

    it('should find messages that mention a specific user', async () => {
      // Act
      const results = await messageRepository.findByMention('user456');

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Hello @user456 and @user123');
      expect(results[1].content).toBe('Hey @user456');
    });
  });

  describe('updateTokenTransferStatus', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a test message with token transfer
      const message = (await messageModel.create({
        conversationId: 'conv123',
        sender: 'user123',
        content: 'Sending you 5 ETH',
        type: MessageType.TOKEN_TRANSFER,
        status: MessageStatus.SENT,
        tokenTransfer: {
          amount: '5000000000000000000',
          tokenAddress: '0x123456789abcdef',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          status: 'pending',
        },
      })) as MessageDocument;
      messageId = (message._id as unknown as string).toString();
    });

    it('should update token transfer status to confirmed', async () => {
      // Act
      const result = await messageRepository.updateTokenTransferStatus(
        messageId,
        'confirmed',
        '0xabcdef123456789',
      );

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.tokenTransfer).toBeDefined();
      if (!result.tokenTransfer) throw new Error('Expected tokenTransfer to be defined');
      expect(result.tokenTransfer.status).toBe('confirmed');
      expect(result.tokenTransfer.transactionHash).toBe('0xabcdef123456789');
    });
  });

  describe('softDelete', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a test message
      const message = (await messageModel.create({
        conversationId: 'conv123',
        sender: 'user123',
        content: 'This will be deleted',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        attachments: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            filename: 'image.jpg',
            mimeType: 'image/jpeg',
            size: 123456,
          },
        ],
      })) as MessageDocument;
      messageId = (message._id as unknown as string).toString();
    });

    it('should soft delete a message', async () => {
      // Act
      const result = await messageRepository.softDelete(messageId);

      // Assert
      expect(result).toBeDefined();
      if (!result) throw new Error('Expected result to be defined');
      expect(result.isDeleted).toBe(true);
      expect(result.content).toBe('[This message was deleted]');
      expect(result.attachments).toEqual([]);
      expect(result.tokenTransfer).toBeUndefined();
    });
  });

  describe('countUnreadMessages', () => {
    beforeEach(async () => {
      // Seed test data
      const messages = [
        {
          conversationId: 'conv123',
          sender: 'user123',
          content: 'Message 1',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          readBy: ['user456'],
        },
        {
          conversationId: 'conv123',
          sender: 'user456',
          content: 'Message 2',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          readBy: ['user123'],
        },
        {
          conversationId: 'conv123',
          sender: 'user456',
          content: 'Message 3',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          readBy: [],
        },
        {
          conversationId: 'conv123',
          sender: 'user789',
          content: 'Message 4',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          readBy: [],
        },
      ];

      await messageModel.insertMany(messages);
    });

    it('should count unread messages for a user', async () => {
      // Act
      const count = await messageRepository.countUnreadMessages('conv123', 'user123');

      // Assert
      expect(count).toBeDefined();
      expect(count).toBe(1); // Only Message 4 is unread
    });
  });
});
