'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardCard from './DashboardCard';
import { Sparkles } from 'lucide-react';

export default function ForYouRail() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      setLoading(true);
      try {
        if (user) {
          // Logged in reader: Fetch recommendations from DB
          const res = await publicApi.getRecommendations();
          if (res?.success) {
            setArticles(res.data || []);
          }
        } else {
          // Guest reader: Fetch recommendations from local storage scoring
          const interestsKey = 'news-portal-interests';
          const historyKey = 'news-portal-history';

          const scoreCard = JSON.parse(localStorage.getItem(interestsKey) || '{}');
          const readList = JSON.parse(localStorage.getItem(historyKey) || '[]');

          // Sort interest categories by score descending
          const sortedCategories = Object.entries(scoreCard)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

          if (sortedCategories.length > 0) {
            const topCategory = sortedCategories[0];
            // Fetch articles for top category
            const res = await publicApi.getArticles({ category: topCategory, limit: 6 });
            if (res?.success) {
              // Exclude read articles
              const filtered = (res.data || []).filter(article => !readList.includes(article.slug));
              
              if (filtered.length >= 3) {
                setArticles(filtered);
              } else {
                // If not enough category-specific articles, backfill with trending
                const trendingRes = await publicApi.getTrending(6);
                const trendingFiltered = (trendingRes.data || []).filter(
                  article => !readList.includes(article.slug) && !filtered.some(f => f.slug === article.slug)
                );
                setArticles([...filtered, ...trendingFiltered].slice(0, 4));
              }
            }
          } else {
            // Fallback to trending
            const trendingRes = await publicApi.getTrending(4);
            const trendingFiltered = (trendingRes.data || []).filter(
              article => !readList.includes(article.slug)
            );
            setArticles(trendingFiltered);
          }
        }
      } catch (err) {
        console.error('Failed to load personalized recommendations', err);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, [user]);

  if (loading || articles.length === 0) return null;

  return (
    <section className="category-rail" aria-labelledby="rail-for-you">
      {/* Rail header */}
      <div className="rail-header">
        <div className="rail-header-left">
          <div className="rail-accent-bar" style={{ backgroundColor: '#dc2626' }} aria-hidden="true" />
          <div className="rail-icon" style={{ color: '#dc2626' }} aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <h2 id="rail-for-you" className="rail-title">
            Recommended For You
          </h2>
        </div>
      </div>

      {/* Card grid — 3 columns */}
      <div className="rail-card-grid">
        {articles.slice(0, 3).map((article, idx) => (
          <DashboardCard
            key={article._id || article.slug}
            article={article}
            priority={idx === 0}
          />
        ))}
      </div>
    </section>
  );
}
