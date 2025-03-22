// File: src/modules/messaging/dtos/group-message-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus, MessageType } from '../schemas/message.schema';

export class MessageReadReceiptDto {
  @ApiProperty({
    description: 'User ID',
    example: '60d21b4667d0d8992e610c85',
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'When the message was read',
    example: '2023-04-01T12:00:00.000Z',
  })
  readAt: Date;
}

export class GroupMessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '60d21b4667d0d8992e610c85',
  })
  id: string;

  @ApiProperty({
    description: 'Sender ID',
    example: '60d21b4667d0d8992e610c86',
  })
  senderId: string;

  @ApiProperty({
    description: 'Sender name',
    example: 'John Doe',
  })
  senderName: string;

  @ApiProperty({
    description: 'Sender avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  senderAvatar?: string;

  @ApiProperty({
    description: 'Group ID',
    example: '60d21b4667d0d8992e610c87',
  })
  groupId: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: '60d21b4667d0d8992e610c87',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
  })
  content: string;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
    example: MessageType.TEXT,
  })
  type: MessageType;

  @ApiProperty({
    description: 'Whether this message is pinned',
    example: false,
  })
  isPinned: boolean;

  @ApiProperty({
    description: 'Who pinned this message',
    example: {
      id: '60d21b4667d0d8992e610c86',
      name: 'John Doe',
    },
    required: false,
  })
  pinnedBy?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'When this message was pinned',
    example: '2023-04-01T12:00:00.000Z',
    required: false,
  })
  pinnedAt?: Date;

  @ApiProperty({
    description: 'Read receipts',
    type: [MessageReadReceiptDto],
  })
  readBy: MessageReadReceiptDto[];

  @ApiProperty({
    description: 'Count of users who read the message',
    example: 5,
  })
  readCount: number;

  @ApiProperty({
    description: 'Total members in the group',
    example: 10,
  })
  totalMembers: number;

  @ApiProperty({
    description: 'Users mentioned in the message',
    type: [Object],
    example: [
      {
        id: '60d21b4667d0d8992e610c89',
        name: 'Jane Smith',
      },
    ],
    required: false,
  })
  mentions?: Array<{
    id: string;
    name: string;
  }>;

  @ApiProperty({
    description: 'Original message this is replying to',
    required: false,
    type: Object,
    example: {
      id: '60d21b4667d0d8992e610c88',
      content: 'Original message',
      senderId: '60d21b4667d0d8992e610c86',
      senderName: 'John Doe',
    },
  })
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
  };

  @ApiProperty({
    enum: MessageStatus,
    description: 'Message delivery status',
    example: MessageStatus.SENT,
  })
  status: MessageStatus;

  @ApiProperty({
    description: 'Additional metadata for specific message types',
    example: {
      pollOptions: ['Yes', 'No', 'Maybe'],
      pollResults: {
        'Yes': 5,
        'No': 2,
        'Maybe': 3,
      },
      pollExpiresAt: '2023-05-01T00:00:00.000Z',
    },
    required: false,
    type: 'object',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether this message is edited',
    example: false,
  })
  isEdited: boolean;

  @ApiProperty({
    description: 'When this message was edited',
    example: '2023-04-01T12:00:00.000Z',
    required: false,
  })
  editedAt?: Date;

  @ApiProperty({
    description: 'Whether this message is deleted',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: 'When this message was deleted',
    example: '2023-04-01T12:00:00.000Z',
    required: false,
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-04-01T12:00:00.000Z',
  })
  createdAt: Date;
}
