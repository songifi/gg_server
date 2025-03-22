import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'John Doe' })
  name: string;
  
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;
  
  @ApiProperty({ example: 5 })
  unreadCount: number;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  lastReadAt?: Date;
  
  @ApiProperty({ example: false })
  hasLeft: boolean;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  joinedAt: Date;
}

export class LastMessageDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;
  
  @ApiProperty({ example: 'Hey everyone! Let\'s discuss the project timeline.' })
  text: string;
  
  @ApiProperty({ 
    example: {
      id: '60d21b4667d0d8992e610c85',
      name: 'John Doe'
    }
  })
  sender: {
    id: string;
    name: string;
  };
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;
  
  @ApiProperty({ example: 'Project Planning', required: false })
  title?: string;
  
  @ApiProperty({ example: true })
  isGroup: boolean;
  
  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];
  
  @ApiProperty({ type: LastMessageDto, required: false })
  lastMessage?: LastMessageDto;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  updatedAt: Date;
  
  @ApiProperty({ example: 10 })
  totalUnread: number;
}
