// File: src/modules/messaging/dtos/create-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEnum, ValidateIf, IsObject } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Recipient ID (for direct messages)',
    example: '60d21b4667d0d8992e610c86',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  @ValidateIf((o) => o.groupId === undefined)
  recipientId?: string;

  @ApiProperty({
    description: 'Group ID (for group messages)',
    example: '60d21b4667d0d8992e610c87',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  @ValidateIf((o) => o.recipientId === undefined)
  groupId?: string;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
    example: MessageType.TEXT,
    default: MessageType.TEXT,
    required: false,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({
    description: 'ID of message being replied to',
    example: '60d21b4667d0d8992e610c88',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  replyToId?: string;

  @ApiProperty({
    description: 'Additional metadata for special message types',
    example: {
      pollOptions: ['Yes', 'No', 'Maybe'],
      pollExpiresAt: '2023-05-01T00:00:00.000Z',
    },
    required: false,
    type: 'object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'User IDs mentioned in the message',
    example: ['60d21b4667d0d8992e610c89', '60d21b4667d0d8992e610c90'],
    required: false,
    type: [String],
  })
  @IsMongoId({ each: true })
  @IsOptional()
  mentionIds?: string[];
}
