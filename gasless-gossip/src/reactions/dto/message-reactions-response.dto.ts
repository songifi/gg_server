export class MessageReactionsResponseDto {
    messageId: string;
    totalReactions: number;
    summary: ReactionSummaryDto[];
    reactions?: ReactionResponseDto[]; // Full reactions list (optional)
  
    constructor(partial: Partial<MessageReactionsResponseDto>) {
      Object.assign(this, partial);
    }
  }