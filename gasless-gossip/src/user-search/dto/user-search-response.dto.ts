import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserSearchResultDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  bio?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  @Transform(({ obj }) => {
    // Only expose wallet address based on privacy settings
    if (obj.settings?.privacy?.walletAddressVisibility === 'public' ||
        (obj.settings?.privacy?.walletAddressVisibility === 'contacts' && obj.isContact)) {
      return obj.primaryWalletAddress;
    }
    return null;
  })
  primaryWalletAddress?: string;

  @Expose()
  isContact?: boolean;

  @Expose()
  matchScore?: number;

  constructor(partial: Partial<UserSearchResultDto>) {
    Object.assign(this, partial);
  }
}

export class UserSearchResponseDto {
  results: UserSearchResultDto[];
  total: number;
  page: number;
  pages: number;
  query: string;
}