import { publicApi } from '@/lib/api';
import HeroSlider from '@/components/HeroSlider';
import CategoryTabStrip from '@/components/CategoryTabStrip';
import LatestNewsGrid from '@/components/LatestNewsGrid';
import TrendingSidebar from '@/components/TrendingSidebar';

const GRID_PAGE_SIZE = 9;

export const revalidate = 60; // Enable ISR caching (60 seconds)

export const metadata = {
  title: 'NewsPortal — Latest News & Breaking Stories',
  description:
    'Stay informed with the latest breaking news, in-depth analysis, and real-time updates from NewsPortal.',
};

// ─── Server-side data fetching ────────────────────────────────────────────────

async function fetchAll() {
  const [gridRes, trendingRes, categoriesRes] = await Promise.allSettled([
    // Grid — page 1 of all latest
    publicApi.getArticles({ sort: 'latest', page: 1, limit: GRID_PAGE_SIZE }),
    // Trending — top 5 by view count
    publicApi.getTrending(5),
    // Categories for tab strip
    publicApi.getCategories(),
  ]);

  return {
    grid:       gridRes.status       === 'fulfilled' ? gridRes.value              : { data: [], pagination: {} },
    trending:   trendingRes.status   === 'fulfilled' ? (trendingRes.value?.data   || []) : [],
    categories: categoriesRes.status === 'fulfilled' ? (categoriesRes.value?.data || []) : [],
  };
}

// ─── Homepage Page Component ──────────────────────────────────────────────────

export default async function HomePage() {
  const { grid, trending, categories } = await fetchAll();

  const gridArticles   = grid.data       || [];
  const gridTotal      = grid.pagination?.total || 0;

  return (
    <>
      {/* ── Hero Slider ─────────────────────────────── */}
      <HeroSlider />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="container">
        <div className="home-layout">

          {/* ── Left column: category tabs + news grid ──────────────────── */}
          <div>
            {/* Category tab strip */}
            <CategoryTabStrip categories={categories} activeSlug={null} />

            {/* Section heading */}
            <div className="section-heading">
              <div className="section-heading-line" aria-hidden="true" />
              <h2>Latest News</h2>
            </div>

            {/* Load-more article grid (client component) */}
            <LatestNewsGrid
              initialArticles={gridArticles}
              initialTotal={gridTotal}
              initialPage={1}
              category={null}
            />
          </div>

          {/* ── Right column: trending sidebar ──────────────────────────── */}
          <TrendingSidebar articles={trending} />
        </div>
      </div>
    </>
  );
}
