import { TokenResponse } from "../models/token.response.model";

export interface AuthenticationResponse {
    user: {
      id: string;
      username: string;
      email: string;
      roles: string[];
    };
    tokens: TokenResponse;

  }

 