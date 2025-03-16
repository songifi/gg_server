// src/modules/user/dto/user-profile.dto.ts

import { Exclude, Expose, Transform } from 'class-transformer';
import { UserStatus } from '../enums/user-status.enum';

@Exclude()
export class UserProfileDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  displayName!: string;

  @Expose()
  bio?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  status!: UserStatus;

  @Expose()
  @Transform(({ obj, value }) => {
    // Only expose wallet address based on privacy settings and viewer relationship
    if (obj.settings?.privacy?.walletAddressVisibility === 'public') {
      return obj.primaryWalletAddress;
    }
    return null;
  })
  primaryWalletAddress?: string;

  @Expose()
  @Transform(({ obj }: { obj: { isContact?: boolean } }) => obj.isContact || false)
  isContact!: boolean;

  constructor(partial: Partial<UserProfileDto>) {
    Object.assign(this, partial);
  }
}