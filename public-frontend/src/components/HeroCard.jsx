import Link from 'next/link';
import Image from 'next/image';
import { timeAgo, buildImageUrl } from '@/lib/utils';
import BookmarkButton from '@/components/BookmarkButton';
import { Newspaper, Circle } from 'lucide-react';

/**
 * HeroCard — full-image overlay card used in the hero section.
 * The `isMain` prop makes the card bigger (spans 2 rows in the grid).
 */
export default function HeroCard({ article, isMain = false }) {
  if (!article) return null;

  const { slug, title, featuredImage, category, author, publishedAt, readingTimeMinutes, isBreaking } = article;
  const imageUrl = buildImageUrl(featuredImage?.url, { width: isMain ? 900 : 640 });

  return (
    <Link
      href={`/articles/${slug}`}
      className={`hero-card ${isMain ? 'hero-card-main' : ''}`}
      aria-label={`Read article: ${title}`}
    >
      {/* Image */}
      <div className="hero-card-img-wrap">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={featuredImage?.alt || title}
            fill
            priority={isMain}
            sizes={isMain
              ? '(max-width: 768px) 100vw, 65vw'
              : '(max-width: 768px) 100vw, 35vw'}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%', minHeight: '220px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)'
            }}
            aria-hidden="true"
          >
            <Newspaper size={64} />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="hero-card-overlay" aria-hidden="true" />

        {/* Breaking badge */}
        {isBreaking && (
          <span className="hero-breaking-badge badge badge-breaking" aria-label="Breaking news">
            <Circle size={10} fill="currentColor" style={{ marginRight: '4px' }} /> Breaking
          </span>
        )}

        {/* Bookmark Button */}
        <div className="hero-card-bookmark">
          <BookmarkButton slug={slug} className="text-white hover:text-white" />
        </div>
      </div>

      {/* Content body pinned to bottom */}
      <div className="hero-card-body">
        {category?.name && (
          <span className="hero-card-category">{category.name}</span>
        )}
        <h2 className="hero-card-title">{title}</h2>
        <div className="hero-card-meta">
          {author?.name && <span>{author.name}</span>}
          {author?.name && publishedAt && (
            <span className="hero-card-meta-dot" aria-hidden="true">·</span>
          )}
          {publishedAt && (
            <time dateTime={publishedAt}>{timeAgo(publishedAt)}</time>
          )}
          {readingTimeMinutes && (
            <>
              <span className="hero-card-meta-dot" aria-hidden="true">·</span>
              <span>{readingTimeMinutes} min read</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
