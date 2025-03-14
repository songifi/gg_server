// src/modules/user/dto/update-user.dto.ts

import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { UserStatus } from '../enums/user-status.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  walletAddress?: string;

  @IsOptional()
  settings?: {
    notifications?: {
      newMessage?: boolean;
      newContact?: boolean;
      tokenTransfer?: boolean;
      groupInvite?: boolean;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'contacts' | 'private';
      lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
      walletAddressVisibility?: 'public' | 'contacts' | 'private';
    };
    theme?: string;
    language?: string;
  };
}