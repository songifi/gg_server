import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactsService } from '../contacts.service';
import { ContactDocument } from '../schemas/contact.schema';
import { ContactGroupDocument } from '../schemas/contact-group.schema';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContactStatus } from '../enums/contact-status.enum';

describe('ContactsService', () => {
  let service: ContactsService;
  let contactModel: Model<ContactDocument>;
  let contactGroupModel: Model<ContactGroupDocument>;

  const mockContactModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-contact-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-contact-id',
        }),
      }),
    })),
  };

  const mockContactGroupModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    deleteOne: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: 'test-group-id',
        toObject: jest.fn().mockReturnValue({
          ...dto,
          id: 'test-group-id',
        }),
      }),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getModelToken('Contact'),
          useValue: mockContactModel,
        },
        {
          provide: getModelToken('ContactGroup'),
          useValue: mockContactGroupModel,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    contactModel = module.get<Model<ContactDocument>>(getModelToken('Contact'));
    contactGroupModel = module.get<Model<ContactGroupDocument>>(getModelToken('ContactGroup'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a new contact', async () => {
      const ownerId = 'owner-id';
      const createContactDto: CreateContactDto = {
        user: 'user-id',
        nickname: 'Test Contact',
      };

      mockContactModel.findOne.mockResolvedValueOnce(null);

      const result = await service.createContact(ownerId, createContactDto);

      expect(mockContactModel.findOne).toHaveBeenCalledWith({
        owner: ownerId,
        user: createContactDto.user,
      });
      expect(mockContactModel.new).toHaveBeenCalledWith({
        owner: ownerId,
        user: createContactDto.user,
        nickname: createContactDto.nickname,
        notes: undefined,
        groups: [],
        status: ContactStatus.ACTIVE,
        isFavorite: false,
      });
      expect(result).toBeDefined();
      expect(result.nickname).toEqual(createContactDto.nickname);
    });

    it('should prevent adding self as contact', async () => {
      const ownerId = 'owner-id';
      const createContactDto: CreateContactDto = {
        user: 'owner-id', // Same as owner
        nickname: 'Self',
      };

      await expect(service.createContact(ownerId, createContactDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if contact exists', async () => {
      const ownerId = 'owner-id';
      const createContactDto: CreateContactDto = {
        user: 'existing-user-id',
        nickname: 'Existing Contact',
      };

      mockContactModel.findOne.mockResolvedValueOnce({
        status: ContactStatus.ACTIVE,
      });

      await expect(service.createContact(ownerId, createContactDto))
        .rejects.toThrow(ConflictException);
    });

    it('should reactivate a removed contact', async () => {
      const ownerId = 'owner-id';
      const createContactDto: CreateContactDto = {
        user: 'removed-user-id',
        nickname: 'Removed Contact',
      };

      const mockRemovedContact = {
        status: ContactStatus.REMOVED,
        nickname: 'Old Name',
        notes: 'Old notes',
        groups: [],
        isFavorite: false,
        save: jest.fn().mockResolvedValue({
          status: ContactStatus.ACTIVE,
          nickname: createContactDto.nickname,
          notes: undefined,
          groups: [],
          isFavorite: false,
          toObject: jest.fn().mockReturnValue({
            id: 'test-contact-id',
            status: ContactStatus.ACTIVE,
            nickname: createContactDto.nickname,
          }),
        }),
      };

      mockContactModel.findOne.mockResolvedValueOnce(mockRemovedContact);

      const result = await service.createContact(ownerId, createContactDto);

      expect(mockRemovedContact.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nickname).toEqual(createContactDto.nickname);
      expect(result.status).toEqual(ContactStatus.ACTIVE);
    });
  });

  // Add more tests for other methods...
});