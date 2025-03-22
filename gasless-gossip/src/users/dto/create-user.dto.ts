// File: src/modules/users/dtos/create-user.dto.ts
import { 
  IsEmail, 
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

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Username (3-30 characters, alphanumeric with hyphens and underscores)',
    example: 'cool_user123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, hyphens, and underscores'
  })
  username: string;

  @ApiProperty({
    description: 'Password (min 8 characters, at least one uppercase, lowercase, number, and special character)',
    example: 'SecureP@ss123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;

  @ApiProperty({
    description: 'Full display name',
    example: 'Jane Doe'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Short bio (optional)',
    example: 'Blockchain enthusiast and developer',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    description: 'Location (optional)',
    example: 'New York, USA',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @ApiProperty({
    description: 'Personal website URL (optional)',
    example: 'https://mywebsite.com',
    required: false
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'StarkNet wallet address (optional)',
    example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    required: false
  })
  @IsString()
  @IsOptional()
  walletAddress?: string;
}