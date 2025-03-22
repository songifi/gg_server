import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from '../schemas/message.schema';

export class UpdateMessageStatusDto {
  @ApiProperty({
    enum: MessageStatus,
    description: 'New status for the message',
    example: MessageStatus.READ,
  })
  @IsEnum(MessageStatus)
  status: MessageStatus;
}
