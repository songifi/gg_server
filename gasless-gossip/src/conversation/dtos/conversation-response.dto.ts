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
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';  


import { ConversationType } from '../enums/conversation.enum';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class ConversationResponseDto {
  @IsMongoId()
  @IsNotEmpty()
  @IsOptional()
  id?: string;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  @IsOptional()
  type?: ConversationType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  @ArrayMinSize(2)
  @IsOptional()
  participants?: CreateUserDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserDto)
  @IsOptional()
  admin?: CreateUserDto;

  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastMessageAt?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
