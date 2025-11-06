/**
 * Main navigation bar
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'LPARs', href: '/lpars' },
  { name: 'RMF III', href: '/rmf3' },
  { name: 'RMF PP', href: '/rmfpp' },
  { name: 'HMAI', href: '/hmai' },
  { name: 'Metrics', href: '/metrics' },
  { name: 'Settings', href: '/settings' },
];

export function Navbar() {
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="text-white font-bold text-xl">
                Zebra HMAI
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

