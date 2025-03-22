// File: src/modules/users/dtos/response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '60d21b4667d0d8992e610c85'
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'cool_user123'
  })
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Full display name',
    example: 'Jane Doe'
  })
  name: string;

  @ApiProperty({
    description: 'Short bio',
    example: 'Blockchain enthusiast and developer',
    required: false
  })
  bio?: string;

  @ApiProperty({
    description: 'Avatar image URL',
    example: 'https://storage.example.com/avatars/user123.jpg',
    required: false
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Cover image URL',
    example: 'https://storage.example.com/covers/user123.jpg',
    required: false
  })
  coverImageUrl?: string;

  @ApiProperty({
    description: 'Location',
    example: 'New York, USA',
    required: false
  })
  location?: string;

  @ApiProperty({
    description: 'Personal website URL',
    example: 'https://mywebsite.com',
    required: false
  })
  website?: string;

  @ApiProperty({
    description: 'Birthday',
    example: '1990-01-01T00:00:00.000Z',
    required: false
  })
  birthday?: Date;

  @ApiProperty({
    description: 'Gender',
    enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
    example: 'prefer-not-to-say',
    required: false
  })
  gender?: string;

  @ApiProperty({
    description: 'Theme preference',
    enum: ['light', 'dark', 'system'],
    example: 'system',
    required: false
  })
  theme?: string;

  @ApiProperty({
    description: 'Interests',
    example: ['blockchain', 'defi', 'nft'],
    required: false,
    type: [String]
  })
  interests?: string[];

  @ApiProperty({
    description: 'StarkNet wallet address',
    example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    required: false
  })
  walletAddress?: string;

  @ApiProperty({
    description: 'Verification status',
    example: false
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2023-04-01T12:00:00.000Z',
    required: false
  })
  lastActive?: Date;

  @ApiProperty({
    description: 'Social media links',
    example: {
      twitter: 'https://twitter.com/username',
      github: 'https://github.com/username'
    },
    required: false
  })
  socialLinks?: Record<string, string>;

  @ApiProperty({
    description: 'Account creation date',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update date',
    example: '2023-04-01T00:00:00.000Z'
  })
  updatedAt: Date;
}
