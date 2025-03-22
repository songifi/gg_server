// src/group/dto/create-group.dto.ts

import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max, Length } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @Length(3, 50)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  joinRequiresApproval?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(1000)
  maxMembers?: number;

  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;

  @IsString()
  @IsOptional()
  encryptionKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// src/group/dto/update-group.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

// src/group/dto/add-member.dto.ts

import { IsString, IsEnum, IsOptional } from 'class-validator';
import { GroupRole } from '../schemas/group-membership.schema';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;
}

// src/group/dto/update-member.dto.ts

import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { GroupRole } from '../schemas/group-membership.schema';

export class UpdateMemberDto {
  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;

  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  isMuted?: boolean;
}

// src/group/dto/group-query.dto.ts

import { IsString, IsBoolean, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GroupQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? [value] : value)
  tags?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
