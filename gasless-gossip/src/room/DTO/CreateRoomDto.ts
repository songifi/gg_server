// src/room/dtos/room.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}


