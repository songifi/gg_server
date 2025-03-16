// src/modules/user/dto/user-response.dto.ts

import { Exclude, Expose, Transform } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Exclude()
export class UserResponseDto {
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
  role!: UserRole;

  @Expose()
  @Transform(({ obj }: { obj: { walletAddresses?: string[] } }) => obj.walletAddresses?.[0] || null)
  primaryWalletAddress?: string;

  @Expose()
  lastSeen!: Date;

  @Expose()
  createdAt!: Date;

  // The password hash is excluded by default due to @Exclude()

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
