// src/modules/challenges/dto/update-progress.dto.ts
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  currentValue: number;
}