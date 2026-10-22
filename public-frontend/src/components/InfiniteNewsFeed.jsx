'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import DashboardCard from './DashboardCard';
import { Sparkles, Layers, CheckCircle2, Loader2 } from 'lucide-react';

const HEADINGS = {
  en: {
    engine: {
      badge: 'Personalized Stream',
      title: 'Recommended For You',
      subtitle: 'Stories tuned to your reading habits and category interests',
    },
    latest: {
      badge: 'Continuous Feed',
      title: 'Explore More News',
      subtitle: 'Fresh stories beyond the category highlights above',
    },
    caughtUp: "You're all caught up with the latest news",
    loadingMore: 'Loading more stories...',
  },
  hi: {
    engine: {
      badge: 'निजीकृत स्ट्रीम',
      title: 'खास आपके लिए अनुशंसित',
      subtitle: 'आपकी पढ़ने की आदतों और पसंदीदा विषयों के आधार पर चुनिंदा समाचार',
    },
    latest: {
      badge: 'सतत समाचार फीड',
      title: 'और अधिक ताज़ा समाचार',
      subtitle: 'उपरोक्त मुख्य श्रेणियों के अतिरिक्त अन्य ताज़ा ख़बरें',
    },
    caughtUp: 'आप सभी नवीनतम समाचार देख चुके हैं',
    loadingMore: 'और समाचार लोड हो रहे हैं...',
  },
  gu: {
    engine: {
      badge: 'વ્યક્તિગત ફીડ',
      title: 'ખાસ તમારા માટે ભલામણ કરેલ',
      subtitle: 'તમારી વાંચન શૈલી અને રુચિ મુજબ પસંદ કરેલ સમાચારો',
    },
    latest: {
      badge: 'અવિરત ન્યૂઝ ફીડ',
      title: 'વધુ તાજા સમાચારો શોધો',
      subtitle: 'ઉપર દર્શાવેલ મુખ્ય કેટેગરીઓ સિવાયના વધારાના સમાચારો',
    },
    caughtUp: 'તમે તમામ નવીનતમ સમાચારો વાંચી ચૂક્યા છો',
    loadingMore: 'વધુ સમાચારો લોડ થઈ રહ્યા છે...',
  },
};

/**
 * InfiniteNewsFeed
 *
 * Provides an endless scrolling stream of news.
 * - If user data exists (logged-in user or guest with local interest scores),
 *   it fetches personalized stories from the recommendation engine.
 * - Otherwise, it fetches the latest news with the top 3 latest articles
 *   from each category excluded to prevent duplicate rail content.
 *
 * @param {Array} initialExcludedSlugs - Slugs already shown in category rails
 * @param {string} lang - 'en' | 'hi' | 'gu'
 */
export default function InfiniteNewsFeed({ initialExcludedSlugs = [], lang = 'en' }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [engineMode, setEngineMode] = useState(false);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const fetchedSlugsRef = useRef(new Set(initialExcludedSlugs));
  const loadingRef = useRef(false);

  // Determine whether personalized engine or latest fallback should be used
  useEffect(() => {
    let hasInterests = false;
    if (user) {
      hasInterests = true;
    } else if (typeof window !== 'undefined') {
      try {
        const storedInterests = JSON.parse(localStorage.getItem('news-portal-interests') || '{}');
        const storedHistory = JSON.parse(localStorage.getItem('news-portal-history') || '[]');
        hasInterests = Object.keys(storedInterests).length > 0 || storedHistory.length > 0;
      } catch (_) {
        hasInterests = false;
      }
    }
    setEngineMode(hasInterests);
  }, [user]);

  const loadMoreArticles = useCallback(async (pageNum, isFresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const currentExcluded = Array.from(fetchedSlugsRef.current).filter(Boolean);
      const excludeParam = currentExcluded.slice(0, 60).join(',');

      let res = null;
      if (engineMode) {
        res = await publicApi.getRecommendations({
          page: pageNum,
          limit: 6,
          lang,
          excludeSlugs: excludeParam,
        });
      }

      // If engine had no items or we are in latest mode, fetch latest
      if (!res?.data?.length) {
        res = await publicApi.getArticles({
          sort: 'latest',
          page: pageNum,
          limit: 6,
          lang,
          excludeSlugs: excludeParam,
        });
      }

      const incoming = res?.data || [];
      if (incoming.length === 0) {
        setHasMore(false);
      } else {
        // Exclude any duplicates
        const uniqueIncoming = incoming.filter((item) => !fetchedSlugsRef.current.has(item.slug));
        
        uniqueIncoming.forEach((item) => fetchedSlugsRef.current.add(item.slug));

        setArticles((prev) => (isFresh ? uniqueIncoming : [...prev, ...uniqueIncoming]));

        // Check if there are more
        if (incoming.length < 6 || res?.pagination?.hasMore === false) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch infinite news batch:', err);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [engineMode, lang]);

  // Initial load
  useEffect(() => {
    fetchedSlugsRef.current = new Set(initialExcludedSlugs);
    setArticles([]);
    setPage(1);
    setHasMore(true);
    loadMoreArticles(1, true);
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
      <div className="rail-header" style={{ alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div className="rail-header-left">
          <div
            className="rail-accent-bar"
            style={{ backgroundColor: engineMode ? '#7c3aed' : '#c0392b' }}
            aria-hidden="true"
          />
          <div
            className="rail-icon"
            style={{ color: engineMode ? '#7c3aed' : '#c0392b' }}
            aria-hidden="true"
          >
            {engineMode ? <Sparkles size={18} /> : <Layers size={18} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h2 className="rail-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                {headerInfo.title}
              </h2>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  letterSpacing: '0.04em',
                  backgroundColor: engineMode ? 'rgba(124, 58, 237, 0.12)' : 'rgba(192, 57, 43, 0.12)',
                  color: engineMode ? '#8b5cf6' : '#e11d48',
                }}
              >
                {headerInfo.badge}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)' }}>
              {headerInfo.subtitle}
            </p>
          </div>
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
        <div
          className="rail-card-grid"
          style={{ marginTop: articles.length > 0 ? '1rem' : 0 }}
          aria-live="polite"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                borderRadius: '12px',
                height: '240px',
                backgroundColor: 'var(--color-bg-alt, #f1f5f9)',
                animation: 'pulse 1.5s infinite',
                border: '1px solid var(--color-border, #e2e8f0)',
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: '20px', margin: '10px 0' }} />

      {/* End of Stream / All Caught Up Indicator */}
      {!hasMore && articles.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '2rem 1rem 3rem',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          <span>{copy.caughtUp}</span>
        </div>
      )}

      {/* Loading pill indicator when scrolling */}
      {loading && articles.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '0.8rem',
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span>{copy.loadingMore}</span>
        </div>
      )}
    </section>
  );
}
