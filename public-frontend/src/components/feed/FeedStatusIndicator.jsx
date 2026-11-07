'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * FeedStatusIndicator — Shows caught-up checkmark or bottom scrolling loading spinner
 */
export default function FeedStatusIndicator({ hasMore, loading, hasArticles, caughtUpText, loadingMoreText }) {
  return (
    <>
      {!hasMore && hasArticles && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '2rem 1rem 3rem',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          <span>{caughtUpText}</span>
        </div>
      )}

      {loading && hasArticles && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '0.8rem',
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span>{loadingMoreText}</span>
        </div>
      )}
    </>
  );
}

