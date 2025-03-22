import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiProperty({
    description: 'New title for the conversation',
    example: 'Updated Project Planning',
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  @IsOptional()
  title?: string;
}
