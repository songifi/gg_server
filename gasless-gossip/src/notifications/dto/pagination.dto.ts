// File: src/modules/notifications/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../interfaces/notification-type.enum';

export class NotificationQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    default: 20,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by read status',
    example: false,
    required: false
  })
  @IsOptional()
  @Type(() => Boolean)
  read?: boolean;

  @ApiProperty({
    enum: NotificationType,
    isArray: true,
    description: 'Filter by notification types',
    required: false
  })
  @IsOptional()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];
}
