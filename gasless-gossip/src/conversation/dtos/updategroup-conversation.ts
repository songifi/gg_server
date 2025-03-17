

import { 
    IsEnum, 
    IsString, 
    IsArray, 
    IsBoolean, 
    IsMongoId, 
    IsOptional, 
    ValidateNested,
    ArrayMinSize,
    ArrayMaxSize,
    MinLength,
    MaxLength,
    IsDate
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ConversationType } from '../schemas/conversation.schema';
  


export class UpdateGroupConversationDto {

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    title?: string;
  

    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @IsMongoId({ each: true })
    participants?: string[];
  

    @IsOptional()
    @IsMongoId()
    admin?: string;
  
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  }
  