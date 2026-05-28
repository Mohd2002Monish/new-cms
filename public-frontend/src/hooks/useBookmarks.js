'use client';

import { useState, useEffect, useCallback } from 'react';

const BOOKMARKS_KEY = 'news-portal-bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse bookmarks', e);
    }
    setIsLoaded(true);

    // Listen for custom event to sync state across components
    const handleStorageChange = () => {
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
    };

    window.addEventListener('bookmarks-updated', handleStorageChange);
    // Also listen to standard storage event for cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key === BOOKMARKS_KEY) handleStorageChange();
    });

    return () => {
      window.removeEventListener('bookmarks-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleBookmark = useCallback((slug) => {
    setBookmarks(prev => {
      const isBookmarked = prev.includes(slug);
      const newBookmarks = isBookmarked 
        ? prev.filter(b => b !== slug) 
        : [...prev, slug];
      
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
      // Dispatch event for other components on the same page
      window.dispatchEvent(new Event('bookmarks-updated'));
      return newBookmarks;
    });
  }, []);

  const isBookmarked = useCallback((slug) => {
    return bookmarks.includes(slug);
  }, [bookmarks]);

  return { bookmarks, toggleBookmark, isBookmarked, isLoaded };
}
