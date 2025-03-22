import { IsString, IsNotEmpty, IsMongoId, IsArray, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'User IDs of participants (excluding the creator)',
    example: ['60d21b4667d0d8992e610c85'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  participantIds: string[];

  @ApiProperty({
    description: 'Optional conversation title',
    example: 'Project Discussion',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    description: 'Initial message content',
    example: 'Hello everyone!',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  initialMessage: string;
}
