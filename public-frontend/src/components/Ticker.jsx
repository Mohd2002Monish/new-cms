'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { Circle, ChevronRight } from 'lucide-react';

export default function Ticker() {
  const [breakingArticles, setBreakingArticles] = useState([]);

  const fetchBreaking = async () => {
    try {
      const res = await publicApi.getBreaking();
      if (res?.success && res.data) {
        setBreakingArticles(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch breaking news:', err);
    }
  };

  useEffect(() => {
    fetchBreaking();
    const intervalId = setInterval(fetchBreaking, 60000); // refresh every 60s
    return () => clearInterval(intervalId);
  }, []);

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
              <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              <ChevronRight size={14} className="breaking-ticker-separator" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
