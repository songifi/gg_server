import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const { sub: userId } = payload;
    
    // Get user from database
    const user = await this.userService.findById(userId);
    
    // Check if user exists and is active
    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    
    // Return user object (will be attached to request object)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
