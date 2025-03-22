import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from '../schemas/message.schema';

export class SenderDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'John Doe' })
  name: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;
  
  @ApiProperty({ type: SenderDto })
  sender: SenderDto;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  conversationId: string;
  
  @ApiProperty({ example: 'Hello, how are you?' })
  content: string;
  
  @ApiProperty({ enum: MessageStatus, example: MessageStatus.SENT })
  status: MessageStatus;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z', required: false })
  deliveredAt?: Date;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z', required: false })
  readAt?: Date;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
}
