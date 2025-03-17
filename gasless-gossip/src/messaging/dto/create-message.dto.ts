import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsArray,
    ValidateNested,
    IsBoolean,
    MaxLength,
  } from "class-validator";
  import { Type } from "class-transformer";
  import { MessageType } from "../enums/message-type.enum";
  import { CreateAttachmentDto } from "./create-attachment.dto";
  import { CreateTokenTransferDto } from "./create-token-transfer.dto";
  
  export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    conversationId!: string;
  
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    content!: string;
  
    @IsEnum(MessageType)
    @IsNotEmpty()
    type!: MessageType;
  
    @IsOptional()
    @IsString()
    replyTo?: string;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentions?: string[];
  
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAttachmentDto)
    attachments?: CreateAttachmentDto[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateTokenTransferDto)
    tokenTransfer?: CreateTokenTransferDto;
  
    @IsOptional()
    @IsBoolean()
    isEdited?: boolean;
  }