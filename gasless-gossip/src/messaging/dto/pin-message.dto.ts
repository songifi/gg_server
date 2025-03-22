// File: src/modules/messaging/dtos/pin-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class PinMessageDto {
  @ApiProperty({
    description: 'Whether to pin or unpin the message',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isPinned: boolean;
}