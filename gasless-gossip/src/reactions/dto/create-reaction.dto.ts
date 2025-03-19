import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ReactionType } from '../enums/reaction-type.enum';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsEnum(ReactionType)
  @IsNotEmpty()
  type: ReactionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8) // Limit emoji/reaction content length
  content: string;
}