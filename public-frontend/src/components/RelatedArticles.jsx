'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import ArticleCard from './ArticleCard';

export default function RelatedArticles({ slug, categoryName }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    publicApi.getRelatedArticles(slug)
      .then((res) => {
        if (res?.success) {
          setRelated(res.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch related articles:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading || related.length === 0) return null;

  return (
    <div className="related-articles-section">
      <h3 className="section-title">
        More from {categoryName || 'this category'}
      </h3>
      <div className="related-articles-grid">
        {related.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>
    </div>
  );
}
