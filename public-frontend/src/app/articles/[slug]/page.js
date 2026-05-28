import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { formatDate, buildImageUrl } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import TiptapRenderer from '@/components/TiptapRenderer';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import ViewTracker from '@/components/ViewTracker';
import { Circle } from 'lucide-react';
import FontSizeAdjuster from '@/components/FontSizeAdjuster';
import ReactionsBar from '@/components/ReactionsBar';
import CommentsSection from '@/components/CommentsSection';
import BookmarkButton from '@/components/BookmarkButton';
import ShareButtons from '@/components/ShareButtons';
import RelatedArticles from '@/components/RelatedArticles';

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
      <ViewTracker slug={slug} />

      <div className="article-page">
        <div className="container">
          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <Breadcrumb items={breadcrumbItems} />

          {/* ── Article header ─────────────────────────────────────────────── */}
          <header className="article-header">
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
            <h1 className="article-title">{article.title}</h1>

            {/* Meta row */}
            <div className="article-meta-row" role="contentinfo">
              {article.author?.name && (
                <>
                  <span>By</span>
                  <span className="article-meta-author">{article.author.name}</span>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                </>
              )}

              {article.category?.slug && (
                <>
                  <Link href={`/category/${article.category.slug}`} className="badge badge-brand">
                    {article.category.name}
                  </Link>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                </>
              )}

              {article.publishedAt && (
                <>
                  <time dateTime={article.publishedAt}>
                    Published: {formatDate(article.publishedAt)}
                  </time>
                </>
              )}

              {article.updatedAt && article.updatedAt !== article.publishedAt && (
                <>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                  <time dateTime={article.updatedAt}>
                    Updated: {formatDate(article.updatedAt)}
                  </time>
                </>
              )}

              {article.readingTimeMinutes && (
                <>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                  <span>{article.readingTimeMinutes} min read</span>
                </>
              )}

              <span className="article-meta-sep" aria-hidden="true">·</span>
              <BookmarkButton slug={article.slug} showLabel={true} />
              <span className="article-meta-sep" aria-hidden="true">·</span>
              <FontSizeAdjuster />
            </div>
          </header>
          
          {/* Top Share Buttons */}
          <div style={{ marginBottom: '2rem' }}>
            <ShareButtons title={article.title} text={article.excerpt} />
          </div>
        </div>

        {/* ── Hero Image (full-width, outside container) ───────────────────── */}
        {heroUrl && (
          <div className="container">
            <figure className="article-hero-wrap">
              <Image
                src={heroUrl}
                alt={article.featuredImage?.alt || article.title}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1200px) 100vw, 1200px"
                style={{ objectFit: 'cover' }}
              />
              {article.featuredImage?.alt && (
                <figcaption className="article-hero-caption">
                  {article.featuredImage.alt}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        <div id="article-content" className="article-body--md container">
          {/* ── Article body — Tiptap JSON rendered ─────────────────────────── */}
          <TiptapRenderer content={article.content} />

          {/* Bottom Share Buttons */}
          <div style={{ marginTop: '2rem' }}>
            <ShareButtons title={article.title} text={article.excerpt} className="justify-center" />
          </div>

          {/* ── Tags row ─────────────────────────────────────────────────────── */}
          {article.tags?.length > 0 && (
            <div className="tags-row" aria-label="Article tags">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="tag-chip"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* ── Related Articles ─────────────────────────────────────────────── */}
          <RelatedArticles slug={article.slug} categoryName={article.category?.name} />

          {/* ── Engagement row (Reactions) ─────────────────────────────────── */}
          <div className="article-engagement-bar">
            <ReactionsBar articleSlug={article.slug} />
          </div>
          <hr className="article-divider" />
          <CommentsSection articleSlug={article.slug} />

          {/* ── Author bio card ──────────────────────────────────────────────── */}
          {article.author?.name && (
            <aside className="author-bio-card" aria-label="About the author">
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
