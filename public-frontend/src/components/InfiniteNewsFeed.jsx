'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import DashboardCard from './DashboardCard';
import FeedSkeletons from './feed/FeedSkeletons';
import FeedStatusIndicator from './feed/FeedStatusIndicator';

const HEADINGS = {
  en: {
    engine: {
      title: 'Recommended For You',
    },
    latest: {
      title: 'Explore More News',
    },
    caughtUp: "You're all caught up with the latest news",
    loadingMore: 'Loading more stories...',
  },
  hi: {
    engine: {
      title: 'खास आपके लिए अनुशंसित',
    },
    latest: {
      title: 'और अधिक ताज़ा समाचार',
    },
    caughtUp: 'आप सभी नवीनतम समाचार देख चुके हैं',
    loadingMore: 'और समाचार लोड हो रहे हैं...',
  },
  gu: {
    engine: {
      title: 'ખાસ તમારા માટે ભલામણ કરેલ',
    },
    latest: {
      title: 'વધુ તાજા સમાચારો શોધો',
    },
    caughtUp: 'તમે તમામ નવીનતમ સમાચારો વાંચી ચૂક્યા છો',
    loadingMore: 'વધુ સમાચારો લોડ થઈ રહ્યા છે...',
  },
};

/**
 * InfiniteNewsFeed — Infinite scrolling news feed with recommendation fallback
 */
export default function InfiniteNewsFeed({ initialExcludedSlugs = [], lang = 'en' }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasGuestInterests, setHasGuestInterests] = useState(false);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const fetchedSlugsRef = useRef(new Set(initialExcludedSlugs));
  const loadingRef = useRef(false);

  // Sync guest reader interests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedInterests = JSON.parse(localStorage.getItem('news-portal-interests') || '{}');
        const storedHistory = JSON.parse(localStorage.getItem('news-portal-history') || '[]');
        if (Object.keys(storedInterests).length > 0 || storedHistory.length > 0) {
          Promise.resolve().then(() => setHasGuestInterests(true));
        }
      } catch (_) {}
    }
  }, []);

  const engineMode = Boolean(user || hasGuestInterests);

  const loadMoreArticles = useCallback(async (pageNum, isFresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      if (isFresh) {
        setPage(1);
        setHasMore(true);
      }
      if (engineMode) {
        let recArticles = [];
        if (user) {
          const res = await publicApi.getRecommendations();
          if (res?.success && Array.isArray(res.data)) recArticles = res.data;
        } else if (typeof window !== 'undefined') {
          const storedInterests = JSON.parse(localStorage.getItem('news-portal-interests') || '{}');
          const storedHistory = JSON.parse(localStorage.getItem('news-portal-history') || '[]');

          const sortedCategories = Object.entries(storedInterests)
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0]);

          if (sortedCategories.length > 0) {
            const topCategory = sortedCategories[0];
            const res = await publicApi.getArticles({ category: topCategory, limit: 12, lang });
            if (res?.success && Array.isArray(res.data)) {
              recArticles = res.data.filter((a) => !storedHistory.includes(a.slug));
            }
          }
        }

        const newEngineArticles = recArticles.filter(
          (a) => a?.slug && !fetchedSlugsRef.current.has(a.slug)
        );

        if (newEngineArticles.length > 0) {
          newEngineArticles.forEach((a) => fetchedSlugsRef.current.add(a.slug));
          setArticles((prev) => (isFresh ? newEngineArticles : [...prev, ...newEngineArticles]));
          setHasMore(false);
          return;
        }
      }

      const res = await publicApi.getArticles({
        page: pageNum,
        limit: 6,
        sort: 'latest',
        lang,
      });

      const incoming = res?.data || [];
      const newArticles = incoming.filter(
        (article) => article?.slug && !fetchedSlugsRef.current.has(article.slug)
      );

      newArticles.forEach((a) => fetchedSlugsRef.current.add(a.slug));

      setArticles((prev) => (isFresh ? newArticles : [...prev, ...newArticles]));

      if (incoming.length < 6 || !res?.pagination?.hasNextPage) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load infinite feed articles', err);
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [engineMode, lang, user]);

  // Initial load
  useEffect(() => {
    fetchedSlugsRef.current = new Set(initialExcludedSlugs);
    Promise.resolve().then(() => {
      loadMoreArticles(1, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineMode, lang]);

  // IntersectionObserver for bottom sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prevPage) => {
            const next = prevPage + 1;
            loadMoreArticles(next, false);
            return next;
          });
        }
      },
      { rootMargin: '300px' }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading, loadMoreArticles]);

  const copy = HEADINGS[lang] || HEADINGS.en;
  const headerInfo = engineMode ? copy.engine : copy.latest;

  return (
    <section className="infinite-news-feed" aria-label="Infinite News Stream" style={{ marginTop: '2.5rem' }}>
      {/* Section Header */}
      <div className="rail-header" style={{ marginBottom: '1.25rem' }}>
        <div className="rail-header-left">
          <h2 className="rail-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {headerInfo.title}
          </h2>
        </div>
      </div>

      {/* Grid of Articles */}
      {articles.length > 0 && (
        <div className="rail-card-grid">
          {articles.map((article) => (
            <DashboardCard key={article._id || article.slug} article={article} />
          ))}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <FeedSkeletons count={3} hasArticles={articles.length > 0} />
      )}

      {/* Bottom Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: '20px', margin: '10px 0' }} />

      {/* End / Loading Indicators */}
      <FeedStatusIndicator
        hasMore={hasMore}
        loading={loading}
        hasArticles={articles.length > 0}
        caughtUpText={copy.caughtUp}
        loadingMoreText={copy.loadingMore}
      />
    </section>
  );
}
