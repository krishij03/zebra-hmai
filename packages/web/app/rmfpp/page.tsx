/**
 * RMF Post Processor Dashboard
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRMF3LPARs } from '@/hooks/use-rmf3';

export default function RMFPPPage() {
  const [selectedLpar, setSelectedLpar] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('CPU');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: lpars, isLoading: lparsLoading, error: lparsError } = useRMF3LPARs();

  // Auto-select first LPAR when loaded
  if (lpars?.length && !selectedLpar) {
    setSelectedLpar(lpars[0]);
  }

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['rmfpp', selectedLpar, selectedReportType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      const queryString = params.toString();
      const url = `/rmfpp/${selectedLpar}/${selectedReportType}${queryString ? `?${queryString}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!selectedLpar && !!selectedReportType,
  });

  const reportTypes = [
    'CPU',
    'CACHE',
    'CHAN',
    'CRYPTO',
    'DEVICE',
    'EADM',
    'ENCLAVE',
    'STORM',
    'STORC',
    'STORCR',
    'STOR M',
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="lpar" className="block text-sm font-medium text-gray-700 mb-1">
              LPAR
            </label>
            {lparsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : lparsError ? (
              <div className="rounded-md bg-red-50 p-2">
                <p className="text-xs text-red-700">API Connection Error</p>
              </div>
            ) : lpars && lpars.length > 0 ? (
              <select
                id="lpar"
                value={selectedLpar}
                onChange={(e) => setSelectedLpar(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              >
                {lpars.map((lpar) => (
                  <option key={lpar} value={lpar}>{lpar}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-yellow-700">No LPARs configured</p>
            )}
          </div>

          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              id="reportType"
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            >
              {reportTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            />
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="bg-white shadow rounded-lg p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        )}

        {error && (
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
                {report.title || `${selectedReportType} Report`}
              </h3>
              <p className="text-sm text-gray-500">
                {report.metadata?.fetchedAt ? (
                  <>Last updated: {new Date(report.metadata.fetchedAt).toLocaleString()}</>
                ) : (
                  <>Time: {report.timestart} - {report.timeend}</>
                )}
              </p>
            </div>

            {/* Display RMFPP Data */}
            {report.data && Array.isArray(report.data) ? (
              <div className="space-y-6">
                {report.data.map((item: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <h4 className="text-md font-semibold text-gray-800">{item.Report}</h4>
                      <p className="text-sm text-gray-500">System: {item.System} | Time: {item.Timestamp}</p>
                    </div>
                    
                    {/* Render segments */}
                    {Object.entries(item).map(([key, value]) => {
                      if (key === 'Report' || key === 'System' || key === 'Timestamp' || key === 'Classes') return null;
                      
                      const valueAsAny = value as any;
                      
                      return (
                        <div key={key} className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">{key}</h5>
                          {typeof value === 'object' && value !== null ? (
                            <div className="bg-gray-50 p-3 rounded text-xs">
                              {valueAsAny.Table && Array.isArray(valueAsAny.Table) ? (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                      <tr>
                                        {Object.keys(valueAsAny.Table[0] || {}).map((header) => (
                                          <th key={header} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {valueAsAny.Table.map((row: any, rowIdx: number) => (
                                        <tr key={rowIdx}>
                                          {Object.values(row).map((cell: any, cellIdx: number) => (
                                            <td key={cellIdx} className="px-2 py-1 whitespace-nowrap">
                                              {String(cell)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <dl className="grid grid-cols-2 gap-2">
                                  {Object.entries(value).map(([k, v]) => (
                                    <div key={k}>
                                      <dt className="text-xs text-gray-500">{k}:</dt>
                                      <dd className="text-xs font-medium">{String(v)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm">{String(value)}</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Handle WLM Classes */}
                    {item.Classes && Array.isArray(item.Classes) && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Workload Classes</h5>
                        {item.Classes.map((cls: any, clsIdx: number) => (
                          <div key={clsIdx} className="bg-gray-50 p-3 rounded mb-2">
                            <p className="text-sm font-medium">{cls.Name}</p>
                            <pre className="text-xs mt-2">{JSON.stringify(cls, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <pre className="text-xs bg-gray-50 p-4 rounded">
                  {JSON.stringify(report.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {!selectedLpar || !selectedReportType ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Please select an LPAR and report type</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}


