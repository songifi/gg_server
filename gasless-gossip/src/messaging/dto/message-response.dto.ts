import { Exclude, Expose, Transform } from "class-transformer";
import { MessageStatus } from "../enums/message-status.enum";
import { MessageType } from "../enums/message-type.enum";

@Exclude()
export class MessageResponseDto {
  @Expose()
  id: string;

  @Expose()
  conversationId: string;

  @Expose()
  sender: string;

  @Expose()
  content: string;

  @Expose()
  type: MessageType;

  @Expose()
  status: MessageStatus;

  @Expose()
  readBy: string[];

  @Expose()
  reactions: {
    userId: string;
    emoji: string;
    createdAt: Date;
  }[];

  @Expose()
  replyTo?: string;

  @Expose()
  mentions?: string[];

  @Expose()
  attachments?: {
    type: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    dimensions?: {
      width: number;
      height: number;
    };
    duration?: number;
    thumbnailUrl?: string;
  }[];

  @Expose()
  tokenTransfer?: {
    amount: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    transactionHash?: string;
    status: string;
  };

  @Expose()
  isEdited: boolean;

  @Expose()
  deliveredAt?: Date;

  @Expose()
  readAt?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }
}