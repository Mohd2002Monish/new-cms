import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { jsonLdSafe } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import CategoryTabStrip from '@/components/CategoryTabStrip';
import LatestNewsGrid from '@/components/LatestNewsGrid';
import TrendingSidebar from '@/components/TrendingSidebar';

export const revalidate = 60; // Enable ISR caching (60 seconds)

const GRID_PAGE_SIZE = 9;

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getCategory(slug, lang) {
  try {
    const res = await publicApi.getCategories({ lang });
    return res.data?.find(c => c.slug === slug) || null;
  } catch { return null; }
}

async function fetchCategoryData(slug, lang) {
  const [categoriesRes, gridRes, trendingRes] = await Promise.allSettled([
    publicApi.getCategories({ lang }),
    publicApi.getArticles({ category: slug, sort: 'latest', page: 1, limit: GRID_PAGE_SIZE, lang }),
    publicApi.getTrending(5, { lang }),
  ]);

  return {
    allCategories: categoriesRes.status === 'fulfilled' ? (categoriesRes.value?.data || []) : [],
    grid:          gridRes.status       === 'fulfilled' ? gridRes.value              : { data: [], pagination: {} },
    trending:      trendingRes.status   === 'fulfilled' ? (trendingRes.value?.data   || []) : [],
  };
}

// ─── Dynamic metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const category = await getCategory(slug, lang);
  if (!category) return { title: 'Category Not Found' };

  const name = category.localizedName || category.name;
  return {
    title: `${name} — Latest News`,
    description:
      category.description ||
      `Browse the latest ${name} news, stories and analysis on NewsPortal.`,
  };
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default async function CategoryPage({ params }) {
  const { lang, slug } = await params;

  const [category, { allCategories, grid, trending }] = await Promise.all([
    getCategory(slug, lang),
    fetchCategoryData(slug, lang),
  ]);

  if (!category) notFound();

  const gridArticles = grid.data            || [];
  const gridTotal    = grid.pagination?.total || 0;
  const categoryName = category.localizedName || category.name;

  return (
    <div style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      <div className="container">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${lang}` },
            { label: categoryName },
          ]}
        />

        {/* JSON-LD for BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdSafe({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: categoryName,
                  item: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${lang}/category/${category.slug}`
                }
              ]
            })
          }}
        />

        {/* Category header */}
        <header style={{ marginBottom: 'var(--space-8)' }}>
          <div
            className="badge badge-brand"
            style={{ marginBottom: 'var(--space-3)' }}
          >
            Category
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-3)',
            }}
          >
            {categoryName}
          </h1>
          {category.description && (
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '48rem', lineHeight: 1.6 }}>
              {category.description}
            </p>
          )}
          {gridTotal > 0 && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              {gridTotal} article{gridTotal !== 1 ? 's' : ''}
            </p>
          )}
        </header>

        {/* Category tab strip — highlights current category */}
        <CategoryTabStrip categories={allCategories} activeSlug={slug} />

        {/* Two-column layout: grid + trending */}
        <div className="home-layout" style={{ paddingTop: 0 }}>
          {/* Left: articles grid with Load More */}
          <div>
            <div className="section-heading">
              <div className="section-heading-line" aria-hidden="true" />
              <h2>Latest in {categoryName}</h2>
            </div>
            <LatestNewsGrid
              initialArticles={gridArticles}
              initialTotal={gridTotal}
              initialPage={1}
              category={slug}
            />
          </div>

          {/* Right: trending */}
          <TrendingSidebar articles={trending} />
        </div>
      </div>
    </div>
  );
}
