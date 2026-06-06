import { publicApi } from '@/lib/api';
import HeroSlider from '@/components/HeroSlider';
import FilterBar from '@/components/FilterBar';
import CategoryRail from '@/components/CategoryRail';
import TrendingSidebar from '@/components/TrendingSidebar';
import NewsletterBox from '@/components/NewsletterBox';
import ForYouRail from '@/components/ForYouRail';
import { Newspaper } from 'lucide-react';

export const revalidate = 60; // ISR — revalidate every 60s

export const metadata = {
  title: 'NewsPortal — Latest News & Breaking Stories',
  description:
    'Stay informed with the latest breaking news, in-depth analysis, and real-time updates from NewsPortal.',
};

// ─── Server-side data fetching ────────────────────────────────────────────────

async function fetchAll() {
  const [trendingRes, categoriesRes] = await Promise.allSettled([
    publicApi.getTrending(5),
    publicApi.getCategories(),
  ]);

  const categories =
    categoriesRes.status === 'fulfilled' ? categoriesRes.value?.data || [] : [];
  const trending =
    trendingRes.status === 'fulfilled' ? trendingRes.value?.data || [] : [];

  // Fetch 3 articles per category in parallel
  const categoryArticlesResults = await Promise.allSettled(
    categories.map((cat) =>
      publicApi.getArticlesByCategory(cat.slug, { limit: 3, sort: 'latest' })
    )
  );

  const categoryArticles = categories.map((cat, idx) => ({
    category: cat,
    articles:
      categoryArticlesResults[idx].status === 'fulfilled'
        ? categoryArticlesResults[idx].value?.data || []
        : [],
  }));

  return { trending, categories, categoryArticles };
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const { trending, categories, categoryArticles } = await fetchAll();

  return (
    <>
      {/* ── Hero Slider ─────────────────────────────────────────────────── */}
      <HeroSlider />

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <FilterBar categories={categories} activeSlug={null} />

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="dashboard-layout">

        {/* ── Left column: category rails ─────────────────────────────── */}
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
              <p style={{ fontWeight: 600 }}>No articles yet. Check back soon!</p>
            </div>
          )}
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
