/**
 * RMF Post Processor Dashboard
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function RMFPPPage() {
  const [selectedLpar, setSelectedLpar] = useState('LPAR1');
  const [selectedReportType, setSelectedReportType] = useState('cpu');

  const { data: report, isLoading } = useQuery({
    queryKey: ['rmfpp', selectedLpar, selectedReportType],
    queryFn: async () => {
      const response = await apiClient.get(
        `/rmfpp/${selectedLpar}/${selectedReportType}`
      );
      return response.data;
    },
  });

  const reportTypes = [
    'cpu',
    'channel',
    'crypto',
    'delay',
    'deviceio',
    'iochannelactivity',
    'iopacing',
    'iorate',
    'job',
    'paging',
    'storm',
    'storagepaths',
    'sysinfo',
    'usage',
    'wlm',
    'workload',
  ];

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            RMF Post Processor
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
            <input
              type="text"
              id="lpar"
              value={selectedLpar}
              onChange={(e) => setSelectedLpar(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            />
          </div>

          <div>
            <label
              htmlFor="reportType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Report Type
            </label>
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
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="bg-white shadow rounded-lg p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        ) : report ? (
          <div>
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedReportType.toUpperCase()} Report
              </h3>
            </div>

            <div className="overflow-x-auto">
              <pre className="text-xs bg-gray-50 p-4 rounded">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

