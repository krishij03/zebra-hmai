/**
 * LPAR Management Page
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/lib/api-client';

interface LPAR {
  name: string;
  ddsHost: string;
  ddsPort: number;
  enabled: boolean;
  lastSync?: string;
}

export default function LPARsPage() {
  const [isAddingLpar, setIsAddingLpar] = useState(false);
  const queryClient = useQueryClient();

  const { data: lpars, isLoading } = useQuery({
    queryKey: ['config', 'lpars'],
    queryFn: async () => {
      const response = await apiClient.get<LPAR[]>('/config/lpars');
      return response.data;
    },
  });

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            LPAR Management
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={() => setIsAddingLpar(true)}
            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Add LPAR
          </button>
        </div>
      </div>

      {/* LPARs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading LPARs...</p>
          </div>
        ) : lpars && lpars.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {lpars.map((lpar) => (
              <li key={lpar.name} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {lpar.name}
                      </h3>
                      <span
                        className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lpar.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {lpar.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>
                        DDS: {lpar.ddsHost}:{lpar.ddsPort}
                      </span>
                      {lpar.lastSync && (
                        <span className="ml-4">
                          Last sync: {new Date(lpar.lastSync).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No LPARs configured</p>
              <button
                type="button"
                onClick={() => setIsAddingLpar(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Add Your First LPAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add LPAR Modal (simplified, should be extracted to component) */}
      {isAddingLpar && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add New LPAR
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This feature will be available soon. Please edit Zconfig.json manually.
            </p>
            <button
              onClick={() => setIsAddingLpar(false)}
              className="w-full inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


