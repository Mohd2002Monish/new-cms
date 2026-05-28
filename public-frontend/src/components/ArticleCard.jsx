import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, Circle } from 'lucide-react';
import { timeAgo, buildImageUrl, truncate } from '@/lib/utils';
import BookmarkButton from '@/components/BookmarkButton';

/**
 * ArticleCard — used in homepage grid, category pages, and search results.
 *
 * @param {object} article - Article object from the public API
 * @param {boolean} priority - Pass true for above-the-fold cards (LCP optimisation)
 */
export default function ArticleCard({ article, priority = false }) {
  if (!article) return null;

  const {
    slug,
    title,
    excerpt,
    featuredImage,
    category,
    author,
    publishedAt,
    readingTimeMinutes,
    isBreaking,
  } = article;

  const imageUrl = buildImageUrl(featuredImage?.url, { width: 640 });
  const imageAlt  = featuredImage?.alt || title;

  return (
    <article className="article-card">
      <Link href={`/articles/${slug}`} tabIndex={-1} aria-hidden="true">
        <div className="card-image-wrap">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="card-image-placeholder" aria-hidden="true">
              <Newspaper size={48} opacity={0.5} />
            </div>
          )}

          {/* Breaking badge overlaid on image */}
          {isBreaking && (
            <span className="card-breaking-badge badge badge-breaking" aria-label="Breaking news">
              <Circle size={10} fill="currentColor" style={{ marginRight: '4px' }} /> Breaking
            </span>
          )}
        </div>
      </Link>

      <div className="card-body">
        {/* Category */}
        <div className="card-header-row">
          {category?.slug ? (
            <Link href={`/category/${category.slug}`} className="card-category">
              {category.name}
            </Link>
          ) : (
            <div />
          )}
          <BookmarkButton slug={slug} className="card-bookmark" />
        </div>

        {/* Title */}
        <h2 className="card-title">
          <Link href={`/articles/${slug}`}>{title}</Link>
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="card-excerpt">{truncate(excerpt, 120)}</p>
        )}

        {/* Meta row */}
        <div className="card-meta">
          {author?.name && <span>{author.name}</span>}
          {author?.name && publishedAt && (
            <span className="card-meta-dot" aria-hidden="true">·</span>
          )}
          {publishedAt && (
            <time dateTime={publishedAt}>{timeAgo(publishedAt)}</time>
          )}
          {readingTimeMinutes && (
            <>
              <span className="card-meta-dot" aria-hidden="true">·</span>
              <span>{readingTimeMinutes} min read</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
