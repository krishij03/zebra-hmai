/**
 * Dashboard home page
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface HealthStatus {
  status: string;
  info?: Record<string, { status: string }>;
}

export default function DashboardPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthStatus>('/health');
      return response.data;
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Dashboard
      </h1>

      {/* System Status Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Status
          </h3>
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center">
                <span
                  className={`h-3 w-3 rounded-full mr-2 ${
                    health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-700">
                  API Status: {health?.status || 'Unknown'}
                </span>
              </div>
              {health?.info && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {Object.entries(health.info).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium text-gray-700">{key}:</span>{' '}
                      <span
                        className={
                          value.status === 'up'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {value.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="RMF Monitor III"
          description="View RMF III performance metrics and reports"
          href="/rmf3"
          color="blue"
        />
        <DashboardCard
          title="RMF Post Processor"
          description="Access RMF PP historical data and analysis"
          href="/rmfpp"
          color="indigo"
        />
        <DashboardCard
          title="HMAI Ingestion"
          description="Monitor and manage HMAI data ingestion jobs"
          href="/hmai"
          color="purple"
        />
        <DashboardCard
          title="LPAR Management"
          description="Manage LPAR configurations and monitoring"
          href="/lpars"
          color="green"
        />
        <DashboardCard
          title="Metrics Explorer"
          description="Explore Prometheus metrics and dashboards"
          href="/metrics"
          color="yellow"
        />
        <DashboardCard
          title="Settings"
          description="Configure application settings and preferences"
          href="/settings"
          color="gray"
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  color: 'blue' | 'indigo' | 'purple' | 'green' | 'yellow' | 'gray';
}

function DashboardCard({ title, description, href, color }: DashboardCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    green: 'bg-green-500 hover:bg-green-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
  };

  return (
    <Link
      href={href}
      className="block bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className={`inline-flex rounded-lg p-3 ${colorClasses[color]} mb-4`}>
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}


