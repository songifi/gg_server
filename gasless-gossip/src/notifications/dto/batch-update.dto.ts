// File: src/modules/notifications/dto/batch-update.dto.ts
import { IsArray, IsMongoId, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchUpdateNotificationsDto {
  @ApiProperty({
    description: 'IDs of notifications to update',
    type: [String],
    example: ['60d21b4667d0d8992e610c85', '60d21b4667d0d8992e610c86']
  })
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds: string[];

  @ApiProperty({
    description: 'Mark notifications as read',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiProperty({
    description: 'Mark notifications as deleted',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}