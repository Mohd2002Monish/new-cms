'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Monitor, TrendingUp, Film, Trophy, Landmark, Newspaper } from 'lucide-react';
import { timeAgo, buildImageUrl } from '@/lib/utils';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/context/AuthContext';

/** Maps a category slug/name to a CSS gradient class and emoji icon */
function getCategoryStyle(categoryName = '') {
  const name = categoryName.toLowerCase();
  if (name.includes('tech'))             return { gradient: 'gradient-tech',          icon: <Monitor size={20} /> };
  if (name.includes('business') || name.includes('finance')) return { gradient: 'gradient-business', icon: <TrendingUp size={20} /> };
  if (name.includes('entertain'))        return { gradient: 'gradient-entertainment',  icon: <Film size={20} /> };
  if (name.includes('sport'))            return { gradient: 'gradient-sports',         icon: <Trophy size={20} /> };
  if (name.includes('politi'))           return { gradient: 'gradient-politics',       icon: <Landmark size={20} /> };
  return { gradient: 'gradient-default', icon: <Newspaper size={20} /> };
}

/** Returns badge config { label, className } based on article flags */
function getBadge(article) {
  if (article.isBreaking) return { label: 'Breaking', className: 'badge-breaking-new' };
  if (article.isLive)     return { label: 'Live',     className: 'badge-live' };
  // Heuristic: show "Top Story" for the first article, "New" if published < 24h ago
  const hoursOld = article.publishedAt
    ? (Date.now() - new Date(article.publishedAt)) / 3_600_000
    : Infinity;
  if (hoursOld < 6)  return { label: 'New',       className: 'badge-new-story' };
  if (hoursOld < 48) return { label: 'Top Story',  className: 'badge-top' };
  return null;
}

/**
 * DashboardCard — compact card used in category rails.
 * @param {object} article
 * @param {boolean} priority — for LCP image optimisation
 */
export default function DashboardCard({ article, priority = false }) {
  if (!article) return null;

  const { slug, title, featuredImage, category, publishedAt, views } = article;
  const imageUrl = buildImageUrl(featuredImage?.url, { width: 400 });
  const { gradient, icon } = getCategoryStyle(category?.name);
  const badge = getBadge(article);
  const { toggleBookmark, isBookmarked: isBookmarkedFn } = useBookmarks();
  const { user, openAuthModal } = useAuth();
  const isBookmarked = isBookmarkedFn(slug);

  return (
    <article className="dashboard-card">
      {/* ── Image area ── */}
      <Link href={`/articles/${slug}`} tabIndex={-1} aria-hidden="true">
        <div className="dashboard-card-image">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 580px) 100vw, (max-width: 900px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className={`${gradient} gradient-no-image`} aria-hidden="true">
              {icon}
            </div>
          )}

          {/* Badge */}
          {badge && (
            <span className={`dashboard-card-badge ${badge.className}`}>
              {badge.label === 'Live' && (
                <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" style={{ borderRadius: '50%' }}>
                  <circle cx="3" cy="3" r="3" />
                </svg>
              )}
              {badge.label}
            </span>
          )}

          {/* Bookmark */}
          <button
            className={`dashboard-card-bookmark${isBookmarked ? ' bookmarked' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user) {
                openAuthModal();
                return;
              }
              toggleBookmark(slug);
            }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </Link>

      {/* ── Card body ── */}
      <div className="dashboard-card-body">
        {/* Category label */}
        {category?.name && (
          <Link href={`/category/${category.slug}`} className="dashboard-card-cat">
            {category.name}
          </Link>
        )}

        {/* Title */}
        <Link href={`/articles/${slug}`}>
          <h3 className="dashboard-card-title">{title}</h3>
        </Link>

        {/* Meta */}
        <div className="dashboard-card-meta">
          <Clock size={10} />
          {publishedAt && <span>{timeAgo(publishedAt)}</span>}
          {views > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{views.toLocaleString()} views</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
