// File: src/modules/notifications/test/notification.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../interfaces/notification-type.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

describe('NotificationService', () => {
  let service: NotificationService;
  let model: Model<Notification>;
  let eventEmitter: EventEmitter2;

  const mockUserId = new Types.ObjectId().toString();
  const mockNotificationId = new Types.ObjectId().toString();

  const mockNotification = {
    _id: mockNotificationId,
    type: NotificationType.NEW_MESSAGE,
    recipientId: mockUserId,
    title: 'Test Notification',
    content: 'This is a test notification',
    read: false,
    createdAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken(Notification.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockNotification),
            constructor: jest.fn().mockResolvedValue(mockNotification),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
            updateMany: jest.fn(),
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

    service = module.get<NotificationService>(NotificationService);
    model = module.get<Model<Notification>>(getModelToken(Notification.name));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        type: NotificationType.NEW_MESSAGE,
        recipientId: new Types.ObjectId(mockUserId),
        title: 'Test Notification',
        content: 'This is a test notification',
      };

      jest.spyOn(mockNotification, 'save').mockResolvedValue(mockNotification);
      jest.spyOn(model, 'new').mockReturnValue(mockNotification as any);
      jest.spyOn(eventEmitter, 'emit');

      const result = await service.create(notificationData);

      expect(result).toEqual(mockNotification);
      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', mockNotification);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with pagination', async () => {
      const queryParams = { page: 1, limit: 10 };

      jest.spyOn(model, 'countDocuments').mockImplementation(() => {
        return {
          exec: jest.fn().mockResolvedValue(1),
        } as any;
      });

      jest.spyOn(model, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockNotification]),
      } as any);

      const result = await service.getUserNotifications(mockUserId, queryParams);

      expect(result.notifications).toEqual([mockNotification]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      jest.spyOn(model, 'findById').mockResolvedValue({
        ...mockNotification,
        read: false,
        recipientId: { toString: () => mockUserId },
      } as any);

      const result = await service.markAsRead(mockNotificationId, mockUserId);

      expect(result.read).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw NotFoundException if notification not found', async () => {
      jest.spyOn(model, 'findById').mockResolvedValue(null);

      await expect(service.markAsRead(mockNotificationId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is not the recipient', async () => {
      jest.spyOn(model, 'findById').mockResolvedValue({
        ...mockNotification,
        recipientId: { toString: () => 'different-user-id' },
      } as any);

      await expect(service.markAsRead(mockNotificationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Add more tests for other methods...
});