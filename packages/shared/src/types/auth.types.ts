/**
 * Authentication and authorization types
 */

/**
 * JWT payload structure
 */
export interface JWTPayload {
  user: {
    name: string;
  };
  iat?: number;
  exp?: number;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  Access: string;
  Refresh: string;
}

/**
 * Admin user from SQLite database
 */
export interface AdminUser {
  id: number;
  name: string;
  password: string;
  refreshToken: string | null;
  accessToken: string | null;
}

/**
 * Login request body
 */
export interface LoginRequest {
  name: string;
  password: string;
}

/**
 * Password change request body
 */
export interface PasswordChangeRequest {
  name: string;
  oldpassword: string;
  newpassword: string;
  cpassword: string;
}

/**
 * Token refresh request body
 */
export interface TokenRefreshRequest {
  token: string;
}

