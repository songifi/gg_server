import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from '../contacts.controller';
import { ContactsService } from '../contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ContactResponseDto } from '../dto/contact-response.dto';
import { BadRequestException } from '@nestjs/common';

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: ContactsService;

  const mockContactsService = {
    createContact: jest.fn(),
    getContacts: jest.fn(),
    getContact: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn(),
    blockContact: jest.fn(),
    unblockContact: jest.fn(),
    getBlockedContacts: jest.fn(),
    createContactGroup: jest.fn(),
    getContactGroups: jest.fn(),
    getContactGroup: jest.fn(),
    updateContactGroup: jest.fn(),
    deleteContactGroup: jest.fn(),
    addContactToGroup: jest.fn(),
    removeContactFromGroup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        {
          provide: ContactsService,
          useValue: mockContactsService,
        },
      ],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a contact', async () => {
      const req = { user: { userId: 'owner-id' } };
      const createContactDto: CreateContactDto = {
        user: 'user-id',
        nickname: 'Test Contact',
      };
      
      const expectedResult = new ContactResponseDto({
        id: 'contact-id',
        user: 'user-id',
        nickname: 'Test Contact',
      });
      
      mockContactsService.createContact.mockResolvedValue(expectedResult);
      
      const result = await controller.createContact(req, createContactDto);
      
      expect(service.createContact).toHaveBeenCalledWith('owner-id', createContactDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getContacts', () => {
    it('should get contacts with pagination', async () => {
      const req = { user: { userId: 'owner-id' } };
      const expectedResult = {
        contacts: [new ContactResponseDto({ id: 'contact-id', user: 'user-id' })],
        total: 1,
        page: 1,
        pages: 1,
      };
      
      mockContactsService.getContacts.mockResolvedValue(expectedResult);
      
      const result = await controller.getContacts(req, 1, 20);
      
      expect(service.getContacts).toHaveBeenCalledWith('owner-id', 1, 20, undefined, undefined, undefined, undefined);
      expect(result).toEqual(expectedResult);
    });
    
    it('should throw BadRequestException for invalid page', async () => {
      const req = { user: { userId: 'owner-id' } };
      
      await expect(controller.getContacts(req, 0, 20)).rejects.toThrow(BadRequestException);
    });
    
    it('should throw BadRequestException for invalid limit', async () => {
      const req = { user: { userId: 'owner-id' } };
      
      await expect(controller.getContacts(req, 1, 0)).rejects.toThrow(BadRequestException);
      await expect(controller.getContacts(req, 1, 101)).rejects.toThrow(BadRequestException);
    });
  });

  // Add more tests for other controller methods...
});