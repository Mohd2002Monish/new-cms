'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { Circle, ChevronRight } from 'lucide-react';

export default function Ticker() {
  const { data: res } = useQuery({
    queryKey: ['breaking-news'],
    queryFn: () => publicApi.getBreaking(),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const breakingArticles = res?.data || [];
  if (breakingArticles.length === 0) return null;

  return (
    <div className="breaking-ticker" role="region" aria-label="Breaking News" aria-live="polite">
      <div className="breaking-ticker-label">
        <Circle size={10} fill="currentColor" className="breaking-dot" aria-hidden="true" />
        BREAKING
      </div>
      <div className="breaking-ticker-marquee">
        <div className="breaking-ticker-content">
          {/* Duplicate list to create seamless infinite scroll effect */}
          {[...breakingArticles, ...breakingArticles].map((article, idx) => (
            <span key={`${article._id || article.slug}-${idx}`} className="breaking-ticker-item">
              <Link href={`/${article.language || 'en'}/articles/${encodeURIComponent(article.slug)}`}>{article.title}</Link>
              <ChevronRight size={14} className="breaking-ticker-separator" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
