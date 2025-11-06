/**
 * API Client for Zebra HMAI Backend
 * Configured Axios instance with interceptors for authentication and error handling
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3090/api/v2';
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

/**
 * Create configured Axios instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

/**
 * Request interceptor - Add auth token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors (Auth disabled for testing)
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Auth disabled - just return the error without redirect
    return Promise.reject(error);
  }
);

/**
 * API Error Response Type
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message || 'An unexpected error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

