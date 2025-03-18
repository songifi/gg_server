// src/modules/achievements/dto/create-badge.dto.ts
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateBadgeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;
}
