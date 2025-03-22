// src/group/dto/create-group.dto.ts

import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

// src/group/dto/update-group.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

// src/group/dto/update-group-settings.dto.ts

import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateGroupSettingsDto {
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  joinRequiresApproval?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(1000)
  maxMembers?: number;

  @IsBoolean()
  @IsOptional()
  membersCanInvite?: boolean;

  @IsBoolean()
  @IsOptional()
  onlyAdminsCanPost?: boolean;

  @IsBoolean()
  @IsOptional()
  requireModerationForPosts?: boolean;
}

// src/group/enums/group-role.enum.ts

export enum GroupRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

// src/group/enums/group-event.enum.ts

export enum GroupEvent {
  CREATED = 'group.created',
  UPDATED = 'group.updated',
  DELETED = 'group.deleted',
  MEMBER_ADDED = 'group.member.added',
  MEMBER_REMOVED = 'group.member.removed',
  ROLE_UPDATED = 'group.role.updated',
  INVITATION_CREATED = 'group.invitation.created',
  INVITATION_ACCEPTED = 'group.invitation.accepted',
  INVITATION_CANCELED = 'group.invitation.canceled',
  SETTINGS_UPDATED = 'group.settings.updated',
}
