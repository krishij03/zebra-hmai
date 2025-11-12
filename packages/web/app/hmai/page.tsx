/**
 * HMAI Ingestion Monitoring Page
 */

'use client';

import { useState, useEffect } from 'react';
import {
  useHMAIIngestionStatus,
  useStartHMAIIngestion,
  useStopHMAIIngestion,
  useClearHMAIDatabase,
  useStartAllHMAI,
  useRunningHMAIProcesses,
  useHMAIData,
  useCheckProcessedData,
  type HMAIIngestionRequest,
} from '@/hooks/use-hmai';
import { useRMF3LPARs } from '@/hooks/use-rmf3';

export default function HMAIPage() {
  const [selectedLpar, setSelectedLpar] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['clpr']);
  const [continuousMonitoring, setContinuousMonitoring] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [viewDataMetric, setViewDataMetric] = useState<string | null>(null);
  
  // UI state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateWarningData, setDuplicateWarningData] = useState<{
    warning: string;
    processedDirs: string[];
    processedMetrics: Record<string, string[]>;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const { data: lpars, isLoading: lparsLoading } = useRMF3LPARs();
  const { data: status, isLoading } = useHMAIIngestionStatus(selectedLpar, {
    enabled: !!selectedLpar,
    refetchInterval: showLoadingModal ? 3000 : 10000, // Poll faster when modal is showing
  });
  const { data: runningProcesses } = useRunningHMAIProcesses();
  const { data: hmaiData, refetch: refetchData } = useHMAIData(
    selectedLpar,
    viewDataMetric || 'clpr',
    { enabled: !!viewDataMetric && !!selectedLpar }
  );
  
  const startMutation = useStartHMAIIngestion(selectedLpar);
  const stopMutation = useStopHMAIIngestion(selectedLpar);
  const clearMutation = useClearHMAIDatabase(selectedLpar);
  const startAllMutation = useStartAllHMAI();
  const checkProcessedQuery = useCheckProcessedData(
    selectedLpar,
    dateRange.startDate,
    continuousMonitoring ? '' : dateRange.endDate,
    selectedMetrics
  );

  // Auto-select first LPAR when loaded
  useEffect(() => {
    if (lpars?.length && !selectedLpar) {
      setSelectedLpar(lpars[0]);
    }
  }, [lpars, selectedLpar]);

  // Monitor job status for completion/failure notifications
  useEffect(() => {
    if (status && showLoadingModal) {
      if (status.status === 'completed') {
        setShowLoadingModal(false);
        showToast('success', `HMAI ingestion completed successfully for ${selectedLpar}!`);
      } else if (status.status === 'failed') {
        setShowLoadingModal(false);
        showToast('error', `HMAI ingestion failed: ${status.error || 'Unknown error'}`);
      }
    }
  }, [status, showLoadingModal, selectedLpar]);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const availableMetrics = ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'];

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
  };

  const handleStart = async () => {
    // First, check if data has already been processed
    try {
      const checkResult = await checkProcessedQuery.refetch();
      
      if (checkResult.data?.alreadyProcessed) {
        // Show warning modal
        setDuplicateWarningData({
          warning: checkResult.data.warning,
          processedDirs: checkResult.data.processedDirs,
          processedMetrics: checkResult.data.processedMetrics,
        });
        setShowDuplicateWarning(true);
        return;
      }
      
      // No duplicates, proceed with ingestion
      startIngestion();
    } catch (error) {
      // If check fails, proceed anyway
      startIngestion();
    }
  };

  const startIngestion = () => {
    const request: HMAIIngestionRequest = {
      metrics: selectedMetrics,
      startDate: dateRange.startDate,
      endDate: continuousMonitoring ? '' : dateRange.endDate,
      continuousMonitoring,
    };
    
    startMutation.mutate(request, {
      onSuccess: () => {
        setShowLoadingModal(true);
        showToast(
          'info',
          continuousMonitoring
            ? `HMAI process started for ${selectedLpar} with continuous monitoring`
            : `HMAI process started for ${selectedLpar}`
        );
      },
      onError: (error: any) => {
        showToast('error', `Failed to start HMAI: ${error.message}`);
      },
    });
  };

  const handleStop = () => {
    stopMutation.mutate(undefined, {
      onSuccess: () => {
        setShowLoadingModal(false);
        showToast('info', `HMAI process stopped for ${selectedLpar}`);
      },
      onError: (error: any) => {
        showToast('error', `Failed to stop HMAI: ${error.message}`);
      },
    });
  };

  const handleClearDatabase = () => {
    if (
      confirm(
        `Are you sure you want to clear all HMAI data and memory for ${selectedLpar}? This cannot be undone.`
      )
    ) {
      clearMutation.mutate(undefined, {
        onSuccess: () => {
          showToast('success', `Database and memory cleared for ${selectedLpar}`);
        },
        onError: (error: any) => {
          showToast('error', `Failed to clear database: ${error.message}`);
        },
      });
    }
  };

  const handleStartAll = () => {
    if (
      confirm(
        'Start HMAI ingestion for all configured LPARs with continuous monitoring?'
      )
    ) {
      startAllMutation.mutate(undefined, {
        onSuccess: (data) => {
          let message = `Started HMAI for: ${data.startedLpars.join(', ')}`;
          if (data.skippedLpars.length > 0) {
            message += `\n\nSkipped (incomplete config): ${data.skippedLpars.join(', ')}`;
          }
          if (data.alreadyRunningLpars.length > 0) {
            message += `\n\nAlready running: ${data.alreadyRunningLpars.join(', ')}`;
          }
          showToast('success', message);
        },
        onError: (error: any) => {
          showToast('error', `Failed to start all LPARs: ${error.message}`);
        },
      });
    }
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const toggleAllMetrics = () => {
    if (selectedMetrics.length === availableMetrics.length) {
      setSelectedMetrics([]);
    } else {
      setSelectedMetrics([...availableMetrics]);
    }
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

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toastMessage.type === 'success'
              ? 'bg-green-500'
              : toastMessage.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
          } text-white max-w-md`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {toastMessage.type === 'success' && (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {toastMessage.type === 'error' && (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {toastMessage.type === 'info' && (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium whitespace-pre-line">
                {toastMessage.message}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-4 inline-flex text-white hover:text-gray-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {showLoadingModal && status && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowLoadingModal(false)}
            />

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>

            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      HMAI Ingestion in Progress
                    </h3>

                    <div className="space-y-4">
                      {/* Status */}
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Status
                        </p>
                        <p className="mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              status.status === 'active'
                                ? 'bg-green-100 text-green-800 animate-pulse'
                                : status.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : status.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {status.status.toUpperCase()}
                          </span>
                        </p>
                      </div>

                      {/* Progress Bar */}
                      {status.progress !== undefined && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Progress
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {Math.round(status.progress)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-in-out"
                              style={{ width: `${status.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Statistics */}
                      {status.statistics && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Files Processed</p>
                            <p className="font-medium">
                              {status.statistics.processedFiles} /{' '}
                              {status.statistics.totalFiles}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Directories</p>
                            <p className="font-medium">
                              {status.statistics.processedDirectories} /{' '}
                              {status.statistics.totalDirectories}
                            </p>
                          </div>
                          {status.statistics.failedFiles > 0 && (
                            <div className="col-span-2">
                              <p className="text-gray-500">Failed Files</p>
                              <p className="font-medium text-red-600">
                                {status.statistics.failedFiles}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metrics */}
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

                      {/* Error */}
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
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={stopMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {stopMutation.isPending ? 'Stopping...' : 'Stop Ingestion'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoadingModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Data Warning Modal */}
      {showDuplicateWarning && duplicateWarningData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDuplicateWarning(false)}
            />

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>

            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Duplicate Data Detected
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 whitespace-pre-line">
                        {duplicateWarningData.warning}
                      </p>
                      
                      {Object.keys(duplicateWarningData.processedMetrics).length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Details:
                          </p>
                          <div className="max-h-40 overflow-y-auto text-xs">
                            {Object.entries(duplicateWarningData.processedMetrics).map(
                              ([dir, metrics]) => (
                                <div key={dir} className="mb-2">
                                  <span className="font-medium">{dir}:</span>{' '}
                                  {metrics.join(', ')}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    startIngestion();
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Continue Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    No LPARs configured. Please add LPAR configuration in
                    Zconfig.json.
                  </p>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border mb-2"
              />

              {/* Continuous Monitoring Checkbox */}
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={continuousMonitoring}
                  onChange={(e) => setContinuousMonitoring(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Continuous Monitoring
                </span>
              </label>

              {!continuousMonitoring && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                </>
              )}
            </div>

            {/* Metrics Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metrics
              </label>

              {/* Select All */}
              <label className="flex items-center mb-2 pb-2 border-b">
                <input
                  type="checkbox"
                  checked={selectedMetrics.length === availableMetrics.length}
                  onChange={toggleAllMetrics}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Select All
                </span>
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
                    <span className="ml-2 text-sm text-gray-700 uppercase">
                      {metric}
                    </span>
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
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stopMutation.isPending ? 'Stopping...' : 'Stop Ingestion'}
              </button>
              <button
                onClick={handleClearDatabase}
                disabled={clearMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearMutation.isPending ? 'Clearing...' : 'Clear Database'}
              </button>
              <button
                onClick={handleStartAll}
                disabled={startAllMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startAllMutation.isPending ? 'Starting...' : 'Start All LPARs'}
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

      {/* Running Processes Across All LPARs */}
      {runningProcesses && Object.keys(runningProcesses).length > 0 && (
        <div className="mt-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Running Processes (All LPARs)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      LPAR
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Continuous Monitoring
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(runningProcesses).map(([lpar, info]) => (
                    <tr key={lpar}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {lpar}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            info.isRunning
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {info.isRunning ? 'Running' : 'Idle'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {info.continuousMonitoring ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View Data Section */}
      <div className="mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            View HMAI Data
          </h3>

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Metric to View
              </label>
              <select
                value={viewDataMetric || ''}
                onChange={(e) => setViewDataMetric(e.target.value || null)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              >
                <option value="">-- Select a metric --</option>
                {availableMetrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {metric.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => refetchData()}
                disabled={!viewDataMetric}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {viewDataMetric && hmaiData ? (
            <div className="overflow-x-auto">
              <p className="text-sm text-gray-500 mb-2">
                Showing data for {selectedLpar} - {viewDataMetric.toUpperCase()}
                {hmaiData.timestamp && (
                  <span className="ml-2">
                    (Last updated:{' '}
                    {new Date(hmaiData.timestamp).toLocaleString()})
                  </span>
                )}
              </p>

              {hmaiData.data && hmaiData.data.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(hmaiData.data[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hmaiData.data.slice(0, 100).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((value, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    No data available for this metric. Start ingestion to
                    populate data.
                  </p>
                </div>
              )}
            </div>
          ) : viewDataMetric ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Select a metric to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
