'use client';

import { useEffect } from 'react';
import { installNavigationTracker } from '@/lib/navigation';

// Mounted once in the root layout so pages can tell back/forward from fresh navigation.
export default function NavigationMemory() {
  useEffect(() => installNavigationTracker(), []);
  return null;
}
