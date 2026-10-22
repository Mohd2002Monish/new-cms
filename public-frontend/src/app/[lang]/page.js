import { publicApi } from '@/lib/api';
import HeroSlider from '@/components/HeroSlider';
import FilterBar from '@/components/FilterBar';
import CategoryRail from '@/components/CategoryRail';
import TrendingSidebar from '@/components/TrendingSidebar';
import NewsletterBox from '@/components/NewsletterBox';
import ForYouRail from '@/components/ForYouRail';
import InfiniteNewsFeed from '@/components/InfiniteNewsFeed';
import { Newspaper } from 'lucide-react';

import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import { notFound } from 'next/navigation';

export const revalidate = 60; // ISR — revalidate every 60s

export const metadata = {
  title: 'NewsPortal — Latest News & Breaking Stories',
  description:
    'Stay informed with the latest breaking news, in-depth analysis, and real-time updates from NewsPortal.',
};

// ─── Server-side data fetching ────────────────────────────────────────────────

async function fetchAll(lang) {
  const [trendingRes, categoriesRes] = await Promise.allSettled([
    publicApi.getTrending(5, { lang }),
    publicApi.getCategories({ lang }),
  ]);

  const categories =
    categoriesRes.status === 'fulfilled' ? categoriesRes.value?.data || [] : [];
  const trending =
    trendingRes.status === 'fulfilled' ? trendingRes.value?.data || [] : [];

  // Fetch 3 articles per main category in parallel (exclude standalone rails for subcategories)
  const mainCategories = categories.filter((cat) => !cat.parentCategory);

  const categoryArticlesResults = await Promise.allSettled(
    mainCategories.map((cat) =>
      publicApi.getArticlesByCategory(cat.slug, { limit: 3, sort: 'latest', lang })
    )
  );

  const categoryArticles = mainCategories.map((cat, idx) => ({
    category: {
      ...cat,
      subcategories: categories.filter(
        (c) => (c.parentCategory?._id || c.parentCategory) === cat._id
      ),
    },
    articles:
      categoryArticlesResults[idx].status === 'fulfilled'
        ? categoryArticlesResults[idx].value?.data || []
        : [],
  }));

  return { trending, categories, categoryArticles };
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export default async function HomePage({ params }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { trending, categories, categoryArticles } = await fetchAll(lang);

  // Collect the top 3 latest article slugs from each category rail to exclude them from the infinite feed
  const railExcludedSlugs = categoryArticles
    .flatMap(({ articles }) => articles.map((a) => a.slug))
    .filter(Boolean);

  return (
    <>
      {/* ── Hero Slider ─────────────────────────────────────────────────── */}
      <HeroSlider />

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <FilterBar categories={categories} activeSlug={null} />

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="dashboard-layout">

        {/* ── Left column: category rails + infinite feed ──────────────── */}
        <div className="category-rails-area">
          <ForYouRail />

          {categoryArticles.map(({ category, articles }) => (
            <CategoryRail
              key={category._id || category.slug}
              category={category}
              articles={articles}
            />
          ))}

          {categoryArticles.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 16px',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg-alt)',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Newspaper size={40} style={{ opacity: 0.4 }} />
              </div>
              <p style={{ fontWeight: 600 }}>{dict.noArticlesYet}</p>
            </div>
          )}

          {/* ── Infinite Scrolling News Feed ── */}
          <InfiniteNewsFeed initialExcludedSlugs={railExcludedSlugs} lang={lang} />
        </div>

        {/* ── Right column: trending + newsletter ─────────────────────── */}
        <div className="dashboard-right-sidebar">
          <TrendingSidebar articles={trending} />
          <NewsletterBox />
        </div>

      </div>
    </>
  );
}
