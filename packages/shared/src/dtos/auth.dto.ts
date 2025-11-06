/**
 * Authentication and Authorization DTOs
 */
import { z } from 'zod';

/**
 * Login Request DTO Schema
 */
export const loginRequestSchema = z.object({
  /** Username */
  name: z.string().min(1, 'Username is required'),
  /** Password */
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequestDTO = z.infer<typeof loginRequestSchema>;

/**
 * Login Response DTO Schema
 */
export const loginResponseSchema = z.object({
  /** Access token (short-lived, 15 minutes) */
  accessToken: z.string(),
  /** Refresh token (long-lived) */
  refreshToken: z.string(),
  /** Token type */
  tokenType: z.literal('Bearer').default('Bearer'),
  /** Expiry time (seconds) */
  expiresIn: z.number().int().positive().default(900),
  /** User information */
  user: z.object({
    name: z.string(),
  }),
});

export type LoginResponseDTO = z.infer<typeof loginResponseSchema>;

/**
 * Token Refresh Request DTO Schema
 */
export const tokenRefreshRequestSchema = z.object({
  /** Refresh token */
  token: z.string().min(1, 'Refresh token is required'),
});

export type TokenRefreshRequestDTO = z.infer<typeof tokenRefreshRequestSchema>;

/**
 * Token Refresh Response DTO Schema
 */
export const tokenRefreshResponseSchema = z.object({
  /** New access token */
  accessToken: z.string(),
  /** Token type */
  tokenType: z.literal('Bearer').default('Bearer'),
  /** Expiry time (seconds) */
  expiresIn: z.number().int().positive().default(900),
});

export type TokenRefreshResponseDTO = z.infer<typeof tokenRefreshResponseSchema>;

/**
 * Password Change Request DTO Schema
 */
export const passwordChangeRequestSchema = z.object({
  /** Current password */
  oldPassword: z.string().min(1, 'Current password is required'),
  /** New password */
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  /** Confirm new password */
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
});

export type PasswordChangeRequestDTO = z.infer<typeof passwordChangeRequestSchema>;

/**
 * Password Change Response DTO Schema
 */
export const passwordChangeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  /** New tokens after password change */
  tokens: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
    })
    .optional(),
});

export type PasswordChangeResponseDTO = z.infer<typeof passwordChangeResponseSchema>;

/**
 * User Info Response DTO Schema
 */
export const userInfoResponseSchema = z.object({
  name: z.string(),
  /** Whether user is using default password */
  isDefaultPassword: z.boolean(),
  /** Last password change timestamp */
  lastPasswordChange: z.string().datetime().optional(),
});

export type UserInfoResponseDTO = z.infer<typeof userInfoResponseSchema>;

