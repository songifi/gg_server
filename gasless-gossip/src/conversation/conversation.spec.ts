import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationRepository } from './conversation.repository';
import { Conversation, ConversationDocument } from './schema/conversation.schema';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  let model: Model<ConversationDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationRepository,
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            find: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<ConversationRepository>(ConversationRepository);
    model = module.get<Model<ConversationDocument>>(getModelToken(Conversation.name));
  });

  it('should get conversations by user with pagination', async () => {
    const mockConversations = [{ _id: '1', title: 'Test' }];
    (model.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(mockConversations),
    });

    const result = await repository.getConversationsByUser('userId', 1, 10);
    expect(result).toEqual(mockConversations);
  });

  it('should update conversation metadata', async () => {
    const mockUpdatedConversation = { _id: '1', title: 'Updated' };
    (model.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedConversation);

    const result = await repository.updateMetadata('1', { title: 'Updated' });
    expect(result).toEqual(mockUpdatedConversation);
  });
});
