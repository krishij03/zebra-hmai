/**
 * React Query hooks for RMF III API
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface RMF3Report {
  timestamp: string;
  lparName: string;
  reportType: string;
  data: Record<string, unknown>;
}

/**
 * Fetch RMF III report data
 */
export function useRMF3Report(
  lpar: string,
  reportType: string,
  options?: Omit<UseQueryOptions<RMF3Report>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['rmf3', lpar, reportType],
    queryFn: async () => {
      const response = await apiClient.get<RMF3Report>(
        `/rmf3/${lpar}/${reportType}`
      );
      return response.data;
    },
    ...options,
  });
}

/**
 * List available RMF III LPARs
 */
export function useRMF3LPARs() {
  return useQuery({
    queryKey: ['rmf3', 'lpars'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/rmf3/lpars');
      return response.data;
    },
  });
}

/**
 * List available RMF III report types
 */
export function useRMF3ReportTypes() {
  return useQuery({
    queryKey: ['rmf3', 'report-types'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/rmf3/report-types');
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - report types don't change often
  });
}

