

import { 
    IsEnum, 
    IsString, 
    IsArray, 
    IsMongoId, 
    IsOptional, 
    ValidateNested,
    ArrayMinSize,
    ArrayMaxSize,
    MinLength,
    MaxLength,
    
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  
export class CreateDirectConversationDto {

    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsMongoId({ each: true })
    participants: string[];
  }