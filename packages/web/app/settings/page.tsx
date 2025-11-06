/**
 * Settings and Configuration Page
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/lib/api-client';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'zconfig'>('general');

  const tabs = [
    { id: 'general' as const, name: 'General' },
    { id: 'zconfig' as const, name: 'Zconfig' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'zconfig' && <ZconfigEditor />}
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        General Settings
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application Name
          </label>
          <input
            type="text"
            defaultValue="Zebra HMAI"
            disabled
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API URL
          </label>
          <input
            type="text"
            defaultValue={process.env.NEXT_PUBLIC_API_URL}
            disabled
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            Configure via NEXT_PUBLIC_API_URL environment variable
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Theme
          </label>
          <select
            disabled
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50"
          >
            <option>Light (Default)</option>
            <option>Dark (Coming Soon)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ZconfigEditor() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['config', 'zconfig'],
    queryFn: async () => {
      const response = await apiClient.get('/config/zconfig');
      return response.data;
    },
  });

  const [editedConfig, setEditedConfig] = useState('');

  // Update edited config when data loads
  if (config && !editedConfig) {
    setEditedConfig(JSON.stringify(config, null, 2));
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Zconfig Editor</h3>
        <p className="mt-1 text-sm text-gray-500">
          View and edit the Zconfig.json configuration file. Changes will be
          validated before saving.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <textarea
              value={editedConfig}
              onChange={(e) => setEditedConfig(e.target.value)}
              className="font-mono text-xs shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full border-gray-300 rounded-md p-3 border"
              rows={20}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              disabled
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditedConfig(JSON.stringify(config, null, 2))}
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          <div className="rounded-md bg-yellow-50 p-4">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> Zconfig editing is view-only in this version.
              To modify configuration, please edit the file directly on the server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

