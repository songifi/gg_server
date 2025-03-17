
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


export class CreateGroupConversationDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    title: string;
  

    @IsArray()
    @ArrayMinSize(2)
    @IsMongoId({ each: true })
    participants: string[];
  

    @IsMongoId()
    admin: string;
  }