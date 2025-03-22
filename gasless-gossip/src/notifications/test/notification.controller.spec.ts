// File: src/modules/notifications/test/notification.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../interfaces/notification-type.enum';
import { Types } from 'mongoose';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockUserId = new Types.ObjectId().toString();
  const mockNotificationId = new Types.ObjectId().toString();

  const mockNotification = {
    _id: mockNotificationId,
    type: NotificationType.NEW_MESSAGE,
    recipientId: { _id: mockUserId },
    title: 'Test Notification',
    content: 'This is a test notification',
    read: false,
    priority: 'medium',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            getUserNotifications: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            batchUpdate: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const queryParams = { page: 1, limit: 10 };
      const result = {
        notifications: [mockNotification],
        unreadCount: 1,
        total: 1,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, 'getUserNotifications').mockResolvedValue(result);

      const response = await controller.getUserNotifications(mockUserId, queryParams);

      expect(service.getUserNotifications).toHaveBeenCalledWith(mockUserId, queryParams);
      expect(response.notifications).toHaveLength(1);
      expect(response.unreadCount).toBe(1);
      expect(response.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      jest.spyOn(service, 'markAsRead').mockResolvedValue(mockNotification as any);

      const result = await controller.markAsRead(mockUserId, mockNotificationId);

      expect(service.markAsRead).toHaveBeenCalledWith(mockNotificationId, mockUserId);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockNotificationId);
    });
  });

  // Add more tests for other methods...
});