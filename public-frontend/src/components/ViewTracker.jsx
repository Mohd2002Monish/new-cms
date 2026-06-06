'use client';

import { useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ViewTracker — fires the view-count increment once per article visit.
 * Client component so it runs only in the browser, not on the server.
 *
 * Uses sessionStorage to avoid double-counting on React StrictMode double-mounts.
 */
export default function ViewTracker({ slug, categorySlug }) {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!slug) return;
    const key = `viewed:${slug}`;
    // Only count once per browser session
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    publicApi.incrementView(slug).catch(() => { /* fail silently */ });

    // Sync preferences
    if (user) {
      publicApi.syncReadArticle(slug)
        .then(() => {
          refreshUser();
        })
        .catch(() => {});
      if (categorySlug) {
        publicApi.syncInterest(categorySlug).catch(() => {});
      }
    } else {
      // LocalStorage fallback for guests
      try {
        const historyKey = 'news-portal-history';
        const interestsKey = 'news-portal-interests';

        const readList = JSON.parse(localStorage.getItem(historyKey) || '[]');
        if (!readList.includes(slug)) {
          readList.push(slug);
          localStorage.setItem(historyKey, JSON.stringify(readList));
        }

        if (categorySlug) {
          const scoreCard = JSON.parse(localStorage.getItem(interestsKey) || '{}');
          scoreCard[categorySlug] = (scoreCard[categorySlug] || 0) + 1;
          localStorage.setItem(interestsKey, JSON.stringify(scoreCard));
        }
      } catch (err) {
        console.error('Failed to update localStorage fallback interests', err);
      }
    }
  }, [slug, categorySlug, user, refreshUser]);

  return null; // renders nothing
}
