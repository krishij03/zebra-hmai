/**
 * RMF Monitor III Dashboard
 */

'use client';

import { useState } from 'react';
import { useRMF3Report, useRMF3LPARs, useRMF3ReportTypes } from '@/hooks/use-rmf3';
import ReactECharts from 'echarts-for-react';

export default function RMF3Page() {
  const [selectedLpar, setSelectedLpar] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('');

  const { data: lpars, isLoading: lparsLoading } = useRMF3LPARs();
  const { data: reportTypes, isLoading: reportTypesLoading } = useRMF3ReportTypes();
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useRMF3Report(selectedLpar, selectedReportType, {
    enabled: !!selectedLpar && !!selectedReportType,
  });

  // Auto-select first LPAR and report type when loaded
  if (lpars?.length && !selectedLpar) {
    setSelectedLpar(lpars[0]);
  }
  if (reportTypes?.length && !selectedReportType) {
    setSelectedReportType(reportTypes[0]);
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            RMF Monitor III
          </h2>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
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

          <div>
            <label
              htmlFor="reportType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Report Type
            </label>
            {reportTypesLoading ? (
              <p className="text-sm text-gray-500">Loading report types...</p>
            ) : reportTypes && reportTypes.length > 0 ? (
              <select
                id="reportType"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-red-600">
                No report types available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="bg-white shadow rounded-lg p-6">
        {reportLoading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        )}

        {reportError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Failed to load report data. Please try again.
            </p>
          </div>
        )}

        {report && (
          <div>
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedReportType}
              </h3>
              <p className="text-sm text-gray-500">
                Last updated: {new Date(report.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Raw Data Display (replace with charts later) */}
            <div className="overflow-x-auto">
              <pre className="text-xs bg-gray-50 p-4 rounded">
                {JSON.stringify(report.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!selectedLpar || !selectedReportType ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">
              Please select an LPAR and report type
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

