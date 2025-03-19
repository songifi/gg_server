export class ReactionSummaryDto {
    content: string;      // Emoji or custom reaction
    count: number;        // Number of reactions of this type
    userIds: string[];    // IDs of users who reacted
    users?: {             // Optional user details for display
      username: string;
      displayName: string;
      avatarUrl?: string;
    }[];
  
    constructor(partial: Partial<ReactionSummaryDto>) {
      Object.assign(this, partial);
    }
  }