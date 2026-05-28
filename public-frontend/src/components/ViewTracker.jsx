'use client';

import { useEffect } from 'react';
import { publicApi } from '@/lib/api';

/**
 * ViewTracker — fires the view-count increment once per article visit.
 * Client component so it runs only in the browser, not on the server.
 *
 * Uses sessionStorage to avoid double-counting on React StrictMode double-mounts.
 */
export default function ViewTracker({ slug }) {
  useEffect(() => {
    if (!slug) return;
    const key = `viewed:${slug}`;
    // Only count once per browser session
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    publicApi.incrementView(slug).catch(() => { /* fail silently */ });
  }, [slug]);

  return null; // renders nothing
}
