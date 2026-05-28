import Link from 'next/link';
import Image from 'next/image';
import { Flame } from 'lucide-react';
import { timeAgo, buildImageUrl } from '@/lib/utils';

/**
 * TrendingSidebar — shows top articles ranked by view count.
 * Server component — data is fetched in the parent (page.js) and passed as props.
 *
 * @param {Array} articles — top trending articles from /api/public/articles/trending
 */
export default function TrendingSidebar({ articles = [] }) {
  return (
    <aside className="trending-sidebar" aria-label="Trending articles">
      {/* Section heading */}
      <div className="section-heading">
        <div className="section-heading-line" aria-hidden="true" />
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={24} style={{ color: 'var(--color-brand)' }} /> Trending
        </h2>
      </div>

      {articles.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>
          No trending articles yet.
        </p>
      ) : (
        <ol className="trending-list" aria-label="Top trending articles">
          {articles.map((article, index) => {
            const thumbUrl = buildImageUrl(article.featuredImage?.url, { width: 128 });
            return (
              <li key={article._id || article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="trending-item"
                  aria-label={`${index + 1}. ${article.title}`}
                >
                  {/* Rank number */}
                  <span className="trending-rank" aria-hidden="true">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  {thumbUrl && (
                    <div className="trending-thumb">
                      <Image
                        src={thumbUrl}
                        alt=""
                        fill
                        sizes="64px"
                        style={{ objectFit: 'cover' }}
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  {/* Title + meta */}
                  <div className="trending-body">
                    <p className="trending-title">{article.title}</p>
                    <div className="trending-meta">
                      {article.publishedAt && (
                        <time dateTime={article.publishedAt}>
                          {timeAgo(article.publishedAt)}
                        </time>
                      )}
                      {article.views > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{article.views.toLocaleString()} views</span>
                        </>
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
