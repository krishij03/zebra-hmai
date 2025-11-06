/**
 * HMAI Ingestion Monitoring Page
 */

'use client';

import { useState } from 'react';
import {
  useHMAIIngestionStatus,
  useStartHMAIIngestion,
  useStopHMAIIngestion,
  type HMAIIngestionRequest,
} from '@/hooks/use-hmai';
import { useRMF3LPARs } from '@/hooks/use-rmf3';

export default function HMAIPage() {
  const [selectedLpar, setSelectedLpar] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['clpr']);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: lpars, isLoading: lparsLoading } = useRMF3LPARs();
  const { data: status, isLoading } = useHMAIIngestionStatus(selectedLpar);
  const startMutation = useStartHMAIIngestion(selectedLpar);
  const stopMutation = useStopHMAIIngestion(selectedLpar);

  // Auto-select first LPAR when loaded
  if (lpars?.length && !selectedLpar) {
    setSelectedLpar(lpars[0]);
  }

  const availableMetrics = ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'];

  const handleStart = () => {
    const request: HMAIIngestionRequest = {
      metrics: selectedMetrics,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      continuousMonitoring: false,
    };
    startMutation.mutate(request);
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            HMAI Ingestion
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuration
            </h3>

            {/* LPAR Selection */}
            <div className="mb-4">
              <label
                htmlFor="lpar"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                LPAR
              </label>
              {lparsLoading ? (
                <p className="text-sm text-gray-500">Loading LPARs...</p>
              ) : lpars && lpars.length > 0 ? (
                <select
                  id="lpar"
                  value={selectedLpar}
                  onChange={(e) => setSelectedLpar(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                >
                  {lpars.map((lpar) => (
                    <option key={lpar} value={lpar}>
                      {lpar}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-md bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-700">
                    No LPARs configured. Please add LPAR configuration in Zconfig.json.
                  </p>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border mb-2"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              />
            </div>

            {/* Metrics Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metrics
              </label>
              <div className="space-y-2">
                {availableMetrics.map((metric) => (
                  <label key={metric} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric)}
                      onChange={() => toggleMetric(metric)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleStart}
                disabled={
                  selectedMetrics.length === 0 ||
                  status?.status === 'active' ||
                  startMutation.isPending
                }
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startMutation.isPending ? 'Starting...' : 'Start Ingestion'}
              </button>
              <button
                onClick={handleStop}
                disabled={status?.status !== 'active' || stopMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stopMutation.isPending ? 'Stopping...' : 'Stop Ingestion'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Job Status
            </h3>

            {isLoading ? (
              <p className="text-gray-500">Loading status...</p>
            ) : status ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : status.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : status.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {status.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">LPAR</p>
                    <p className="mt-1 text-sm text-gray-900">{status.lpar}</p>
                  </div>
                </div>

                {status.metrics && status.metrics.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Metrics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {status.metrics.map((metric) => (
                        <span
                          key={metric}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {status.progress !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Progress
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {status.progress}%
                    </p>
                  </div>
                )}

                {status.startTime && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Start Time
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(status.startTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {status.endTime && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      End Time
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(status.endTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {status.error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{status.error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No active or recent jobs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

