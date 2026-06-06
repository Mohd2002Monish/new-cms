'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { publicApi } from '@/lib/api';

const BOOKMARKS_KEY = 'news-portal-bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  // Load bookmarks
  useEffect(() => {
    async function loadBookmarks() {
      if (user) {
        try {
          // If we have local bookmarks on login, sync them to DB first
          const local = localStorage.getItem(BOOKMARKS_KEY);
          let localSlugs = [];
          if (local) {
            try {
              localSlugs = JSON.parse(local);
            } catch (e) {
              // ignore
            }
          }

          if (localSlugs.length > 0) {
            const syncRes = await publicApi.syncBookmarksDb(localSlugs);
            if (syncRes?.success) {
              setBookmarks(syncRes.bookmarks);
              localStorage.removeItem(BOOKMARKS_KEY); // clear local storage since we synchronized
              window.dispatchEvent(new Event('bookmarks-updated'));
              setIsLoaded(true);
              return;
            }
          }

          // Otherwise, just fetch from DB
          const res = await publicApi.getBookmarksDb();
          if (res?.success) {
            setBookmarks(res.data || []);
          }
        } catch (err) {
          console.error('Failed to load DB bookmarks', err);
        }
      } else {
        // Guest: Load from localStorage
        try {
          const stored = localStorage.getItem(BOOKMARKS_KEY);
          if (stored) {
            setBookmarks(JSON.parse(stored));
          } else {
            setBookmarks([]);
          }
        } catch (e) {
          console.error('Failed to parse bookmarks', e);
        }
      }
      setIsLoaded(true);
    }

    loadBookmarks();

    // Listen for custom event to sync state across components on the same page
    const handleStorageChange = () => {
      if (user) {
        publicApi.getBookmarksDb()
          .then(res => {
            if (res?.success) setBookmarks(res.data || []);
          })
          .catch(() => {});
      } else {
        try {
          const stored = localStorage.getItem(BOOKMARKS_KEY);
          if (stored) {
            setBookmarks(JSON.parse(stored));
          } else {
            setBookmarks([]);
          }
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('bookmarks-updated', handleStorageChange);
    // Also listen to standard storage event for cross-tab sync
    const handleCrossTabSync = (e) => {
      if (e.key === BOOKMARKS_KEY) handleStorageChange();
    };
    window.addEventListener('storage', handleCrossTabSync);

    return () => {
      window.removeEventListener('bookmarks-updated', handleStorageChange);
      window.removeEventListener('storage', handleCrossTabSync);
    };
  }, [user]);

  const toggleBookmark = useCallback(async (slug) => {
    if (user) {
      try {
        const res = await publicApi.toggleBookmarkDb(slug);
        if (res?.success) {
          setBookmarks(res.bookmarks);
          window.dispatchEvent(new Event('bookmarks-updated'));
        }
      } catch (err) {
        console.error('Failed to toggle DB bookmark', err);
      }
    } else {
      // Guest: localStorage toggle
      setBookmarks(prev => {
        const isBookmarked = prev.includes(slug);
        const newBookmarks = isBookmarked 
          ? prev.filter(b => b !== slug) 
          : [...prev, slug];
        
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
        window.dispatchEvent(new Event('bookmarks-updated'));
        return newBookmarks;
      });
    }
  }, [user]);

  const isBookmarked = useCallback((slug) => {
    return bookmarks.includes(slug);
  }, [bookmarks]);

  return { bookmarks, toggleBookmark, isBookmarked, isLoaded };
}
