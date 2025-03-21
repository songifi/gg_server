export interface JwtPayload {
    sub: string; // user ID
    email: string;
    username?: string;
    roles?: string[];
    iat?: number; // issued at
    exp?: number; // expiration time
  }
  