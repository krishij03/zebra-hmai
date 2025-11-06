/**
 * Dashboard layout with navigation
 */

import { Navbar } from '@/components/layout/navbar';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

