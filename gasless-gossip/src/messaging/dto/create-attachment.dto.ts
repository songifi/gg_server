
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsNumber,
    IsOptional,
    IsUrl,
    MaxLength,
  } from "class-validator";
  
  export class CreateAttachmentDto {
    @IsEnum(["image", "video", "audio", "file"])
    @IsNotEmpty()
    type: "image" | "video" | "audio" | "file";
  
    @IsUrl()
    @IsNotEmpty()
    url: string;
  
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    filename: string;
  
    @IsString()
    @IsNotEmpty()
    mimeType: string;
  
    @IsNumber()
    @IsNotEmpty()
    size: number;
  
    @IsOptional()
    dimensions?: {
      width: number;
      height: number;
    };
  
    @IsOptional()
    @IsNumber()
    duration?: number;
  
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;
  }