import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, IsBoolean, MaxLength, ArrayMinSize, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Title of the conversation (required for group conversations)',
    example: 'Project Planning',
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  @ValidateIf((o) => o.isGroup === true)
  title?: string;

  @ApiProperty({
    description: 'Whether this is a group conversation',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @ApiProperty({
    description: 'User IDs of participants to include in the conversation',
    example: ['60d21b4667d0d8992e610c85'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  participantIds: string[];

  @ApiProperty({
    description: 'Initial message to start the conversation',
    example: 'Hey everyone! Let\'s discuss the project timeline.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  initialMessage?: string;
}
