import { Exclude, Expose, Type } from 'class-transformer';
import { ReactionType } from '../enums/reaction-type.enum';

@Exclude()
export class ReactionResponseDto {
  @Expose()
  id: string;

  @Expose()
  messageId: string;

  @Expose()
  userId: string;

  @Expose()
  type: ReactionType;

  @Expose()
  content: string;

  @Expose()
  createdAt: Date;

  // Additional user information for display
  @Expose()
  username?: string;

  @Expose()
  displayName?: string;

  @Expose()
  avatarUrl?: string;

  constructor(partial: Partial<ReactionResponseDto>) {
    Object.assign(this, partial);
  }
}