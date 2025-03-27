import { ApiProperty } from '@nestjs/swagger';

export class TokenResponse {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer', description: 'Token type' })
  tokenType: string;

  @ApiProperty({ example: 3600, description: 'Access token expiration time in seconds' })
  expiresIn: number;
}

export class AuthResponse {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Whether the email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'User roles' })
  roles: string[];

  @ApiProperty({ description: 'Token information' })
  tokens: TokenResponse;
}

export class MessageResponse {
  @ApiProperty({ description: 'Response message' })
  message: string;
}
