import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticationService } from '../authentication.service';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthenticationService) {
    super();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // First, call the default AuthGuard logic to validate JWT
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    // Extract token using passport-jwt ExtractJwt
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedException('No token provided');

    // Check if the token is blacklisted
    if (await this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token is invalid (blacklisted)');
    }

    return true;
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    console.log('Extracted User:', user);
    if (err || !user) {
      throw new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}

/**
 JwtAuthGuard

 This guard extends the default `AuthGuard('jwt')` from `@nestjs/passport` to handle JWT-based authentication.
  It validates the JWT token, checks if it's blacklisted, and extracts user information.

 ## Usage
 * You can apply this guard at the controller or method level using the `@UseGuards()` decorator:

 @UseGuards(JwtAuthGuard)
 @Get('profile')
 getProfile(@GetUser() user) {
   return user;
 }


 ## Methods
 `canActivate(context: ExecutionContext): Promise<boolean>`
  - Validates the JWT token using `AuthGuard`.
  - Extracts the token using `passport-jwt`'s `ExtractJwt`.
  - Throws `UnauthorizedException` if:
  - No token is provided.
  - The token is blacklisted.
 
### `handleRequest<TUser>(err, user, info, context, status): TUser`
    - Handles the request after JWT validation.
    - If the user is invalid or not found, throws `UnauthorizedException`.
 
  

  ## Example:
  @Controller('users')
  export class UserController {
   @UseGuards(JwtAuthGuard)
   @Get('profile')
   getProfile(@GetUser() user) {
      return user;
    }
  }
  ```
 */
