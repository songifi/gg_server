import { IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { ContactStatus } from '../enums/contact-status.enum';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  user!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groups?: string[];

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}