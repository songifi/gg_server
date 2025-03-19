// src/modules/achievements/dto/update-progress.dto.ts
import { IsNumber, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  progress: number;
}