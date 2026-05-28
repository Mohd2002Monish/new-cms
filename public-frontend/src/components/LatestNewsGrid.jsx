'use client';

import { useState } from 'react';
import ArticleCard from './ArticleCard';
import { publicApi } from '@/lib/api';
import { Newspaper, Loader2, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 9;

/**
 * LatestNewsGrid — client component that renders the article grid with
 * a "Load More" button that appends results without changing the URL.
 *
 * @param {Array}   initialArticles — SSR-fetched first page of articles
 * @param {number}  initialTotal    — total article count (from API pagination)
 * @param {number}  initialPage     — current page number that was SSR'd (usually 1)
 * @param {string}  category        — optional category slug filter
 */
export default function LatestNewsGrid({
  initialArticles = [],
  initialTotal    = 0,
  initialPage     = 1,
  category        = null,
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [page,     setPage]     = useState(initialPage);
  const [total,    setTotal]    = useState(initialTotal);
  const [loading,  setLoading]  = useState(false);

  const hasMore = articles.length < total;

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await publicApi.getArticles({
        sort:    'latest',
        page:    nextPage,
        limit:   PAGE_SIZE,
        ...(category ? { category } : {}),
      });
      setArticles(prev => [...prev, ...(res.data || [])]);
      setTotal(res.pagination?.total || total);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more articles:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="latest-grid-wrapper">
      {/* Search active state could optionally show a title or info */}

      {articles.length === 0 && !loading && (
        <div className="latest-grid-empty">
          <div className="empty-state-icon" aria-hidden="true">
            <Newspaper size={48} opacity={0.3} />
          </div>
          <p>No articles found in this category.</p>
        </div>
      )}

      {/* Grid of articles */}
      <div className="latest-grid">
        {articles.map((article, idx) => (
          <ArticleCard
            key={article._id || article.slug}
            article={article}
            priority={idx < 4 && page === 1} // eager load first few images on page 1
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="latest-grid-loadmore">
          <button
            className="btn btn-outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={16} aria-hidden="true" style={{ marginRight: '8px' }} />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown size={16} aria-hidden="true" style={{ marginRight: '8px' }} />
                Load More Articles
              </>
            )}
          </button>
        </div>
      )}

      {/* Article count */}
      {!hasMore && articles.length > 0 && (
        <p style={{
          textAlign: 'center',
          marginTop: 'var(--space-8)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
        }}>
          Showing all {total} article{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
