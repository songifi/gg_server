import { IsOptional, IsString } from "class-validator";

export class UpdateRoomDto {
    @IsString()
    @IsOptional()
    name?: string;
  
    @IsString()
    @IsOptional()
    description?: string;
  }