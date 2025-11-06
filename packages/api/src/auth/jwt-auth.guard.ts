/**
 * JWT Authentication Guard
 * Protects routes that require authentication
 * Can be disabled for testing via DISABLE_AUTH=true environment variable
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Bypass authentication if DISABLE_AUTH is set to true
    if (process.env.DISABLE_AUTH === 'true') {
      return true;
    }
    return super.canActivate(context);
  }
}

