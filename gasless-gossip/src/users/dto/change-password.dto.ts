// File: src/modules/users/dtos/change-password.dto.ts
import { 
    IsNotEmpty, 
    IsString, 
    MinLength, 
    Matches
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class ChangePasswordDto {
    @ApiProperty({
      description: 'Current password',
      example: 'CurrentP@ss123'
    })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;
  
    @ApiProperty({
      description: 'New password (min 8 characters, at least one uppercase, lowercase, number, and special character)',
      example: 'NewSecureP@ss123'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    newPassword: string;
  }