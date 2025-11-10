/**
 * JWT Strategy for Passport
 * Validates JWT tokens and extracts user information
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';

interface JwtPayload {
  name: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_TOKEN_SECRET || 'default-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<{ name: string }> {
    const user = await this.authService.validateUser(payload.name);
    
    if (!user) {
      throw new UnauthorizedException('Invalid token - user not found');
    }
    
    return user;
  }
}


