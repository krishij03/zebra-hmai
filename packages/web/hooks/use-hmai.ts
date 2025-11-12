/**
 * React Query hooks for HMAI API
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface HMAIIngestionJob {
  id: string;
  lpar: string;
  metrics: string[];
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface HMAIIngestionRequest {
  metrics: string[];
  startDate: string;
  endDate: string;
  continuousMonitoring?: boolean;
}

export interface HMAIData {
  lpar: string;
  metric: string;
  data: Record<string, unknown>[];
  timestamp: string;
}

/**
 * Start HMAI ingestion job
 */
export function useStartHMAIIngestion(lpar: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: HMAIIngestionRequest) => {
      const response = await apiClient.post(
        `/hmai/${lpar}/ingestion/start`,
        request
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hmai', lpar, 'jobs'] });
    },
  });
}

/**
 * Stop HMAI ingestion job
 */
export function useStopHMAIIngestion(lpar: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/hmai/${lpar}/ingestion/stop`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hmai', lpar, 'jobs'] });
    },
  });
}

/**
 * Get HMAI ingestion job status
 */
export function useHMAIIngestionStatus(
  lpar: string,
  options?: Omit<UseQueryOptions<HMAIIngestionJob>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['hmai', lpar, 'ingestion-status'],
    queryFn: async () => {
      const response = await apiClient.get<HMAIIngestionJob>(
        `/hmai/${lpar}/ingestion/status`
      );
      return response.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    ...options,
  });
}

/**
 * Query HMAI data
 */
export function useHMAIData(
  lpar: string,
  metric: string,
  options?: Omit<UseQueryOptions<HMAIData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['hmai', lpar, metric],
    queryFn: async () => {
      const response = await apiClient.get<HMAIData>(
        `/hmai/${lpar}/${metric}`
      );
      return response.data;
    },
    ...options,
  });
}

/**
 * List available HMAI metrics
 */
export function useHMAIMetrics() {
  return useQuery({
    queryKey: ['hmai', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/hmai/metrics');
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Clear HMAI database and memory for an LPAR
 */
export function useClearHMAIDatabase(lpar: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/hmai/${lpar}/clear-database`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hmai', lpar] });
    },
  });
}

/**
 * Start HMAI ingestion for all configured LPARs
 */
export function useStartAllHMAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/hmai/ingestion/start-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hmai'] });
    },
  });
}

/**
 * Get running HMAI processes for all LPARs
 */
export function useRunningHMAIProcesses() {
  return useQuery({
    queryKey: ['hmai', 'running-processes'],
    queryFn: async () => {
      const response = await apiClient.get<
        Record<string, { isRunning: boolean; continuousMonitoring: boolean }>
      >('/hmai/running-processes');
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}


