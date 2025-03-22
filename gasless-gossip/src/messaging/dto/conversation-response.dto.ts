import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'John Doe' })
  name: string;
  
  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

export class LastMessageDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;
  
  @ApiProperty({ example: 'Hello, how are you?' })
  content: string;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  senderId: string;
}

export class ConversationResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;
  
  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];
  
  @ApiProperty({ example: 'Project Discussion', required: false })
  title?: string;
  
  @ApiProperty({ type: LastMessageDto, required: false })
  lastMessage?: LastMessageDto;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  updatedAt: Date;
}
