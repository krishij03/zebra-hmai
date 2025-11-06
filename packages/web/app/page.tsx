/**
 * Home page - redirects to dashboard (auth disabled for testing)
 */

import { redirect } from 'next/navigation';

export default async function HomePage() {
  // Auth disabled - redirect directly to dashboard
  redirect('/dashboard');
}
