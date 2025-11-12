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

  const { data: lpars, isLoading: lparsLoading, error: lparsError } = useRMF3LPARs();
  const { data: reportTypes, isLoading: reportTypesLoading, error: reportTypesError } = useRMF3ReportTypes();
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
            ) : lparsError ? (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700 font-semibold">API Connection Error</p>
                <p className="text-xs text-red-600 mt-1">
                  Cannot connect to API. Please check that the backend is running on port 3090.
                </p>
              </div>
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
            ) : reportTypesError ? (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700 font-semibold">API Connection Error</p>
                <p className="text-xs text-red-600 mt-1">
                  Cannot load report types from API.
                </p>
              </div>
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
                {report.title || selectedReportType}
              </h3>
              <p className="text-sm text-gray-500">
                {report.metadata?.fetchedAt ? (
                  <>Last updated: {new Date(report.metadata.fetchedAt).toLocaleString()}</>
                ) : (
                  <>Time: {report.timestart} - {report.timeend}</>
                )}
              </p>
            </div>

            {/* Caption Data */}
            {report.caption && Object.keys(report.caption).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(report.caption).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded">
                      <dt className="text-xs font-medium text-gray-500">{key}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Table Data */}
            {report.table && report.table.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {report.columnhead?.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.table.map((row, idx) => (
                      <tr key={idx}>
                        {report.columnhead?.map((header) => (
                          <td key={header} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No table data available for this report.</p>
            </div>
            )}
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

