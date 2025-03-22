import { IsString, IsNotEmpty, IsMongoId, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The recipient user ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({
    description: 'The conversation ID (optional if starting a new conversation)',
    example: '60d21b4667d0d8992e610c86',
    required: false,
  })
  @IsMongoId()
  conversationId?: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
