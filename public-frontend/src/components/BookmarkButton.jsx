'use client';

import { Bookmark } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/context/AuthContext';

/**
 * Renders a bookmark icon that toggles the saved state of an article slug.
 * @param {Object} props
 * @param {string} props.slug - The article slug
 * @param {boolean} [props.showLabel=false] - Whether to show the "Save" / "Saved" label
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function BookmarkButton({ slug, showLabel = false, className = '' }) {
  const { toggleBookmark, isBookmarked, isLoaded } = useBookmarks();
  const { user, openAuthModal } = useAuth();

  // Return a non-interactive placeholder to prevent hydration mismatch
  // while we figure out if this article is saved
  if (!isLoaded) {
    return (
      <button className={`bookmark-btn ${className}`} aria-hidden="true" disabled>
        <Bookmark size={18} className="text-slate-400" />
        {showLabel && <span>Save</span>}
      </button>
    );
  }

  const saved = isBookmarked(slug);

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // prevent navigation if placed inside a Link component
        if (!user) {
          openAuthModal();
          return;
        }
        toggleBookmark(slug);
      }}
      className={`bookmark-btn ${saved ? 'active' : ''} ${className}`}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark article'}
      title={saved ? 'Remove from saved' : 'Save for later'}
    >
      <Bookmark 
        size={18} 
        fill={saved ? 'currentColor' : 'none'} 
        className={saved ? 'text-brand' : 'text-slate-600 dark:text-slate-300'} 
      />
      {showLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
