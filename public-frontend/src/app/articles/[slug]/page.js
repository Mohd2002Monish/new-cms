import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { formatDate, buildImageUrl } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import ViewTracker from '@/components/ViewTracker';
import { Circle } from 'lucide-react';
import FontSizeAdjuster from '@/components/FontSizeAdjuster';
import BookmarkButton from '@/components/BookmarkButton';
import ShareButtons from '@/components/ShareButtons';
import ArticleContentWrapper from '@/components/ArticleContentWrapper';

export const revalidate = 60; // Enable ISR caching (60 seconds)

// ─── Server-side data fetching ────────────────────────────────────────────────

async function getArticle(slug) {
  try {
    const res = await publicApi.getArticle(slug);
    return res.data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

// ─── Dynamic metadata (SSR, picked up by Google News) ─────────────────────────

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article Not Found' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonicalUrl = article.seo?.canonicalUrl || `${siteUrl}/articles/${slug}`;
  const ogImage = article.seo?.ogImage || article.featuredImage?.url || '';

  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
    alternates: { canonical: canonicalUrl },
    robots: article.seo?.noIndex ? 'noindex,nofollow' : 'index,follow',
    openGraph: {
      type: 'article',
      title: article.seo?.ogTitle || article.title,
      description: article.seo?.ogDescription || article.seo?.metaDescription || article.excerpt,
      url: canonicalUrl,
      images: ogImage ? [{ url: buildImageUrl(ogImage, { width: 1200, format: 'webp' }) }] : [],
      publishedTime: article.publishedAt,
      modifiedTime:  article.updatedAt,
      authors:       article.author?.name ? [article.author.name] : [],
      section:       article.category?.name || '',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seo?.ogTitle || article.title,
      description: article.seo?.ogDescription || article.seo?.metaDescription || article.excerpt,
      images: ogImage ? [buildImageUrl(ogImage, { width: 1200, format: 'webp' })] : [],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // ─── JSON-LD Structured Data ────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seo?.metaDescription || article.excerpt,
    image: article.featuredImage?.url ? [article.featuredImage.url] : [],
    datePublished: article.publishedAt,
    dateModified:  article.updatedAt,
    author: {
      '@type': 'Person',
      name: article.author?.name || 'NewsPortal',
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'NewsPortal',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/articles/${slug}`,
    },
  };

  const heroUrl = buildImageUrl(article.featuredImage?.url, { width: 1200 });

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(article.category?.slug
      ? [{ label: article.category.name, href: `/category/${article.category.slug}` }]
      : []),
    { label: article.title },
  ];

  return (
    <>
      {/* JSON-LD — must be server-rendered for Google News */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.label,
              item: item.href ? `${siteUrl}${item.href === '/' ? '' : item.href}` : `${siteUrl}/articles/${slug}`,
            })),
          }),
        }}
      />

      {/* Reading progress bar (client component) */}
      <ReadingProgressBar />

      {/* View counter — fire-and-forget on mount */}
      <ViewTracker slug={slug} categorySlug={article.category?.slug} />

      <div className="article-page">
        <div className="container">
          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* ── Hero Image (full-width, outside container) ───────────────────── */}
        {heroUrl && (
          <div className="container">
            <figure className="article-hero-wrap" style={{ position: 'relative' }}>
              <Image
                src={heroUrl}
                alt={article.featuredImage?.alt || article.title}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1200px) 100vw, 1200px"
                style={{ objectFit: 'cover', zIndex: 1 }}
              />

              <div 
                className="article-hero-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.65) 55%, rgba(15, 23, 42, 0.15) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '2.5rem',
                  zIndex: 10,
                  color: '#ffffff'
                }}
              >
                <div className="article-hero-content" style={{ width: '100%', maxWidth: '860px' }}>
                  {/* Breaking badge */}
                  {article.isBreaking && (
                    <span
                      className="badge badge-breaking"
                      aria-label="Breaking news"
                      style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Circle size={10} fill="currentColor" style={{ marginRight: '4px' }} /> Breaking News
                    </span>
                  )}

                  {/* H1 — one per page (SEO requirement) */}
                  <h1 className="article-title hero-title" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '0.75rem' }}>{article.title}</h1>

                  {/* Sub-heading (Excerpt) */}
                  {article.excerpt && (
                    <p className="article-subtitle hero-subtitle" style={{ color: 'rgba(255, 255, 255, 0.95)', textShadow: '0 1px 3px rgba(0,0,0,0.4)', fontWeight: '400', fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{article.excerpt}</p>
                  )}

                  {/* Meta row */}
                  <div className="article-meta-row hero-meta-row" role="contentinfo" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', margin: 0, color: 'rgba(255,255,255,0.8)' }}>
                    {article.author?.name && (
                      <>
                        <span>By</span>
                        <span className="article-meta-author" style={{ color: '#ffffff', fontWeight: 600 }}>{article.author.name}</span>
                        <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                      </>
                    )}

                    {article.category?.slug && (
                      <>
                        <Link href={`/category/${article.category.slug}`} className="badge badge-brand" style={{ backgroundColor: '#C0392B', color: '#ffffff', border: 'none' }}>
                          {article.category.name}
                        </Link>
                        <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                      </>
                    )}

                    {article.publishedAt && (
                      <>
                        <time dateTime={article.publishedAt} style={{ color: 'rgba(255,255,255,0.9)' }}>
                          Published: {formatDate(article.publishedAt)}
                        </time>
                      </>
                    )}

                    {article.updatedAt && article.updatedAt !== article.publishedAt && (
                      <>
                        <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                        <time dateTime={article.updatedAt} style={{ color: 'rgba(255,255,255,0.9)' }}>
                          Updated: {formatDate(article.updatedAt)}
                        </time>
                      </>
                    )}

                    {article.readingTimeMinutes && (
                      <>
                        <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>{article.readingTimeMinutes} min read</span>
                      </>
                    )}

                    <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <BookmarkButton slug={article.slug} showLabel={true} style={{ color: '#ffffff' }} />
                    <span className="article-meta-sep" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <FontSizeAdjuster />
                  </div>
                </div>
              </div>

              {article.featuredImage?.alt && (
                <figcaption className="article-hero-caption sr-only">
                  {article.featuredImage.alt}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        {/* Top Share Buttons */}
        <div className="container" style={{ marginBlock: '1.5rem' }}>
          <ShareButtons title={article.title} text={article.excerpt} />
        </div>

        <div id="article-content" className="article-body--md container">
          <ArticleContentWrapper initialArticle={article} />

          {/* ── Author bio card ──────────────────────────────────────────────── */}
          {article.author?.name && (
            <aside className="author-bio-card" aria-label="About the author" style={{ marginTop: '2.5rem' }}>
              <div
                className="author-avatar"
                aria-hidden="true"
              >
                {article.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="author-label">Written by</p>
                <p className="author-name">{article.author.name}</p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
