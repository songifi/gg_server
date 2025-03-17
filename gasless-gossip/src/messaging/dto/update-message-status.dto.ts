
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsDateString,
  } from "class-validator";
  import { MessageStatus } from "../enums/message-status.enum";
  
  export class UpdateMessageStatusDto {
    @IsString()
    @IsNotEmpty()
    messageId!: string;
  
    @IsEnum(MessageStatus)
    @IsNotEmpty()
    status!: MessageStatus;
  
    @IsOptional()
    @IsDateString()
    deliveredAt?: string;
  
    @IsOptional()
    @IsDateString()
    readAt?: string;
  }
  