/**
 * Authentication utilities
 */

import Cookies from 'js-cookie';
import { apiClient } from './api-client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  // Backend expects 'name' instead of 'username'
  const requestBody = {
    name: credentials.username,
    password: credentials.password,
  };
  const response = await apiClient.post<AuthTokens>('/auth/login', requestBody);
  const { accessToken, refreshToken } = response.data;

  // Store tokens in cookies
  Cookies.set('access_token', accessToken, {
    expires: 1 / 24, // 1 hour
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  Cookies.set('refresh_token', refreshToken, {
    expires: 7, // 7 days
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  // Fetch user profile
  const userResponse = await apiClient.get<User>('/auth/profile');
  return userResponse.data;
}

/**
 * Logout user
 */
export function logout(): void {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<User | null> {
  try {
    const response = await apiClient.get<User>('/auth/profile');
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!Cookies.get('access_token');
}

