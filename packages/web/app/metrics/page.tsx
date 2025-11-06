/**
 * Prometheus Metrics Explorer
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface PrometheusMetric {
  name: string;
  type: string;
  help: string;
  value?: number;
}

export default function MetricsPage() {
  const [filter, setFilter] = useState('');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const response = await apiClient.get<PrometheusMetric[]>('/metrics');
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const filteredMetrics = metrics?.filter(
    (metric) =>
      metric.name.toLowerCase().includes(filter.toLowerCase()) ||
      metric.help?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Metrics Explorer
          </h2>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <input
          type="text"
          placeholder="Filter metrics..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
        />
      </div>

      {/* Metrics Display */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading metrics...</p>
          </div>
        ) : filteredMetrics && filteredMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Metric Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.map((metric, idx) => (
                  <tr key={`${metric.name}-${idx}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {metric.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {metric.help || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.value !== undefined ? metric.value.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">No metrics found</p>
          </div>
        )}

        {filteredMetrics && filteredMetrics.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing {filteredMetrics.length} of {metrics?.length || 0} metrics
            </p>
          </div>
        )}
      </div>

      {/* HMAI Job Metrics */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          HMAI Job Metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total Jobs"
            metric="zebra_hmai_job_total"
            description="Total number of HMAI ingestion jobs"
          />
          <MetricCard
            title="Active Jobs"
            metric="zebra_hmai_job_active"
            description="Currently running jobs"
          />
          <MetricCard
            title="Failed Jobs"
            metric="zebra_hmai_job_failed_total"
            description="Total number of failed jobs"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  metric,
  description,
}: {
  title: string;
  metric: string;
  description: string;
}) {
  const { data } = useQuery({
    queryKey: ['metric', metric],
    queryFn: async () => {
      const response = await apiClient.get(`/metrics/${metric}`);
      return response.data;
    },
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <p className="mt-2 text-3xl font-semibold text-gray-900">
        {data?.value !== undefined ? data.value : '-'}
      </p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

