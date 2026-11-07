'use client';

import Link from 'next/link';

/**
 * ArticleTags — List of clickable hashtag chips for article taxonomy
 */
export default function ArticleTags({ tags = [] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="tags-row" aria-label="Article tags">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/?tag=${encodeURIComponent(tag)}`}
          className="tag-chip"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}

