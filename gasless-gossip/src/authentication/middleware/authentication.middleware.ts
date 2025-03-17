import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../authentication.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(
    
    private readonly jwtService: JwtService,

    private readonly authService: AuthenticationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      //  decode the token first
      const payload = this.jwtService.verify(token);

      // check if the token is blacklisted
      const isBlacklisted = await this.authService.isTokenBlacklisted(token);
      if (isBlacklisted) {  
        throw new UnauthorizedException('Token is blacklisted');
      }

      // attach the decoded user info to the request object
      req.user = payload;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}


/**
 *  authentication.middleware.ts
 *  Middleware to authenticate requests using JWT tokens.
 * 
 * This middleware intercepts incoming HTTP requests and checks for a valid JWT token 
 * in the `Authorization` header. If the token is valid and not blacklisted, it attaches 
 * the decoded user information to the request object for further processing.
 *
 * Usage:
 * - Apply the middleware globally or to specific routes using `app.use()` or `@UseMiddleware`.
 *
 
 ## Example:

 * import { MiddlewareConsumer, Module } from '@nestjs/common';
 * import { AuthenticationMiddleware } from './authentication.middleware';
 *
 * @Module({
 *   providers: [AuthenticationService, JwtService],
 * })
 * export class AppModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(AuthenticationMiddleware).forRoutes('*');
 *   }
 * }
 
 * 
 ## Behavior:
 * - ✅ If the token is valid → Decoded user information is attached to `req.user`.
 * - ❌ If the token is missing → `401 Unauthorized` is thrown.
 * - ❌ If the token is blacklisted → `401 Unauthorized` is thrown.
 * - ❌ If the token is expired or invalid → `401 Unauthorized` is thrown.
 *
 ## Possible Outcomes:
 * - If successful → Request proceeds to the next handler.
 * - If failed → An `UnauthorizedException` is thrown.
 */
