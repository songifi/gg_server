import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RemoveReactionDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  userId?: string; // Only needed for admin removals
}