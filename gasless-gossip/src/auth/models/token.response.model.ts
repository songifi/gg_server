export class TokenResponse {
    accessToken!: string;
    refreshToken!: string;
    expiresIn!: number;
    tokenType: string = 'Bearer';
  }