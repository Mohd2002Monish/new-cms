import Link from 'next/link';
import Image from 'next/image';
import { Flame, Newspaper } from 'lucide-react';
import { timeAgo, buildImageUrl } from '@/lib/utils';

/**
 * TrendingSidebar v2.0 — "Trending Now" panel with numbered items,
 * 52×52px square thumbnails, faint horizontal rules, and the
 * redesigned card layout from the design spec.
 *
 * Server component — data is fetched in the parent (page.js) and passed as props.
 * @param {Array} articles — top trending articles from /api/public/articles/trending
 */
export default function TrendingSidebar({ articles = [] }) {
  return (
    <aside className="trending-panel" aria-label="Trending articles">
      {/* Panel header */}
      <div className="trending-panel-header">
        <Flame size={18} style={{ color: '#C0392B', flexShrink: 0 }} aria-hidden="true" />
        <h2 className="trending-panel-title">Trending Now</h2>
      </div>

      {articles.length === 0 ? (
        <p style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          No trending articles yet.
        </p>
      ) : (
        <ol className="trending-panel-list" aria-label="Top trending articles">
          {articles.slice(0, 5).map((article, index) => {
            const thumbUrl = buildImageUrl(article.featuredImage?.url, { width: 128 });
            return (
              <li key={article._id || article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="trending-panel-item"
                  aria-label={`${index + 1}. ${article.title}`}
                >
                  {/* Large faded red rank number */}
                  <span className="trending-panel-rank" aria-hidden="true">
                    {index + 1}
                  </span>

                  {/* 52×52 square thumbnail */}
                  <div className="trending-panel-thumb">
                    {thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt=""
                        fill
                        sizes="52px"
                        style={{ objectFit: 'cover' }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%', height: '100%',
                          background: 'linear-gradient(135deg, #4a0e0e, #8b1a1a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        aria-hidden="true"
                      >
                        <Newspaper size={20} style={{ color: 'rgba(255,255,255,0.6)' }} />
                      </div>
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="trending-panel-body">
                    <p className="trending-panel-item-title">{article.title}</p>
                    <div className="trending-panel-item-meta">
                      {article.publishedAt && (
                        <time dateTime={article.publishedAt}>
                          {timeAgo(article.publishedAt)}
                        </time>
                      )}
                      {article.views > 0 && article.publishedAt && (
                        <span aria-hidden="true">·</span>
                      )}
                      {article.views > 0 && (
                        <span>{article.views.toLocaleString()} views</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
