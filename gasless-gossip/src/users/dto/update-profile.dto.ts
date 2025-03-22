// File: src/modules/users/dtos/update-profile.dto.ts
import { 
    IsNotEmpty, 
    IsString, 
    MinLength, 
    MaxLength, 
    Matches,
    IsOptional,
    IsUrl,
    IsEnum,
    IsDateString,
    IsArray
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class UpdateProfileDto {
    @ApiProperty({
      description: 'Username (3-30 characters, alphanumeric with hyphens and underscores)',
      example: 'cool_user123',
      required: false
    })
    @IsString()
    @IsOptional()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
      message: 'Username can only contain letters, numbers, hyphens, and underscores'
    })
    username?: string;
  
    @ApiProperty({
      description: 'Full display name',
      example: 'Jane Doe',
      required: false
    })
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(100)
    name?: string;
  
    @ApiProperty({
      description: 'Short bio',
      example: 'Blockchain enthusiast and developer',
      required: false
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    bio?: string;
  
    @ApiProperty({
      description: 'Location',
      example: 'New York, USA',
      required: false
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    location?: string;
  
    @ApiProperty({
      description: 'Personal website URL',
      example: 'https://mywebsite.com',
      required: false
    })
    @IsUrl()
    @IsOptional()
    website?: string;
  
    @ApiProperty({
      description: 'Birthday',
      example: '1990-01-01',
      required: false
    })
    @IsDateString()
    @IsOptional()
    birthday?: string;
  
    @ApiProperty({
      description: 'Gender',
      enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
      example: 'prefer-not-to-say',
      required: false
    })
    @IsEnum(['male', 'female', 'non-binary', 'prefer-not-to-say'])
    @IsOptional()
    gender?: string;
  
    @ApiProperty({
      description: 'Theme preference',
      enum: ['light', 'dark', 'system'],
      example: 'system',
      required: false
    })
    @IsEnum(['light', 'dark', 'system'])
    @IsOptional()
    theme?: string;
  
    @ApiProperty({
      description: 'Interests',
      example: ['blockchain', 'defi', 'nft'],
      required: false,
      type: [String]
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    interests?: string[];
  
    @ApiProperty({
      description: 'Social media links',
      example: {
        twitter: 'https://twitter.com/username',
        github: 'https://github.com/username'
      },
      required: false
    })
    @IsOptional()
    socialLinks?: Record<string, string>;
  
    @ApiProperty({
      description: 'StarkNet wallet address',
      example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      required: false
    })
    @IsString()
    @IsOptional()
    walletAddress?: string;
  }
  