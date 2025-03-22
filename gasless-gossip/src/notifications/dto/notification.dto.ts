// File: src/modules/notifications/dto/notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../interfaces/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: '60d21b4667d0d8992e610c85'
  })
  id: string;

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.NEW_MESSAGE
  })
  type: NotificationType;

  @ApiProperty({
    description: 'ID of the user who triggered the notification',
    example: '60d21b4667d0d8992e610c86',
    required: false
  })
  senderId?: string;

  @ApiProperty({
    description: 'Sender name',
    example: 'John Doe',
    required: false
  })
  senderName?: string;

  @ApiProperty({
    description: 'Sender avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false
  })
  senderAvatar?: string;

  @ApiProperty({
    description: 'Related conversation ID',
    example: '60d21b4667d0d8992e610c87',
    required: false
  })
  conversationId?: string;

  @ApiProperty({
    description: 'Related message ID',
    example: '60d21b4667d0d8992e610c88',
    required: false
  })
  messageId?: string;

  @ApiProperty({
    description: 'Related transaction ID',
    example: '60d21b4667d0d8992e610c89',
    required: false
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Message'
  })
  title: string;

  @ApiProperty({
    description: 'Notification content',
    example: 'You received a new message from John Doe'
  })
  content: string;

  @ApiProperty({
    description: 'Additional data related to the notification',
    type: 'object',
    additionalProperties: true,
    required: false
  })
  data?: Record<string, any>;

  @ApiProperty({
    enum: ['high', 'medium', 'low'],
    description: 'Notification priority',
    example: 'medium'
  })
  priority: string;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false
  })
  read: boolean;

  @ApiProperty({
    description: 'When the notification was read',
    example: '2023-04-01T12:00:00.000Z',
    required: false
  })
  readAt?: Date;

  @ApiProperty({
    description: 'Action URL or deep link when clicking the notification',
    example: '/conversations/60d21b4667d0d8992e610c87',
    required: false
  })
  clickAction?: string;

  @ApiProperty({
    description: 'URL for notification image',
    example: 'https://example.com/notification-image.jpg',
    required: false
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'When the notification was created',
    example: '2023-04-01T12:00:00.000Z'
  })
  createdAt: Date;
}
