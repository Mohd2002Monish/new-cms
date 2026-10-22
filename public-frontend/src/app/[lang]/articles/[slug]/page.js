import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { formatDate, buildImageUrl, jsonLdSafe } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import ViewTracker from '@/components/ViewTracker';
import { Circle } from 'lucide-react';
import FontSizeAdjuster from '@/components/FontSizeAdjuster';
import BookmarkButton from '@/components/BookmarkButton';
import ShareButtons from '@/components/ShareButtons';
import ArticleContentWrapper from '@/components/ArticleContentWrapper';
import { getDictionary, hasLocale, LANGUAGE_LABELS } from '@/i18n/dictionaries';

export const revalidate = 60; // Enable ISR caching (60 seconds)

// hreflang alternates from the article's linked translations (incl. itself)
function buildLanguageAlternates(article, siteUrl) {
  const languages = {
    [article.language || 'en']: `${siteUrl}/${article.language || 'en'}/articles/${article.slug}`,
  };
  for (const t of article.translations || []) {
    languages[t.language] = `${siteUrl}/${t.language}/articles/${t.slug}`;
  }
  if (languages.en) languages['x-default'] = languages.en;
  return languages;
}

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

// ─── Dynamic metadata (SSR, picked up by Google News & Social Networks) ──────

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article Not Found | NewsPortal' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonicalUrl = article.seo?.canonicalUrl || `${siteUrl}/${lang}/articles/${encodeURIComponent(slug)}`;
  const articlePicture = article.seo?.ogImage || article.featuredImage?.url || '';

  const metaTitle = article.seo?.metaTitle || article.title;
  const metaDescription = article.seo?.metaDescription || article.excerpt;
  const categoryLabel = (lang !== 'en' && article.category?.nameTranslations?.[lang]) || article.category?.name || 'News';

  const defaultOgImage = `${siteUrl}/logo-landscape.jpg`;
  const socialImageUrl = articlePicture
    ? buildImageUrl(articlePicture, { width: 1200, format: 'webp' })
    : defaultOgImage;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: article.tags?.length > 0 ? article.tags.join(', ') : `${categoryLabel}, news, updates`,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(article, siteUrl),
    },
    robots: article.seo?.noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large',
    openGraph: {
      type: 'article',
      siteName: 'NewsPortal',
      locale: lang === 'hi' ? 'hi_IN' : lang === 'gu' ? 'gu_IN' : 'en_US',
      title: article.seo?.ogTitle || article.title,
      description: article.seo?.ogDescription || metaDescription,
      url: canonicalUrl,
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: article.featuredImage?.alt || article.title,
        },
      ],
      publishedTime: article.publishedAt,
      modifiedTime:  article.updatedAt,
      authors:       article.author?.name ? [article.author.name] : ['NewsPortal Editorial'],
      section:       categoryLabel,
      tags:          article.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@NewsPortal',
      creator: article.author?.name ? `@${article.author.name.replace(/\s+/g, '')}` : '@NewsPortal',
      title: article.seo?.ogTitle || article.title,
      description: article.seo?.ogDescription || metaDescription,
      images: [socialImageUrl],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ArticlePage({ params }) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
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
      '@id': `${siteUrl}/${lang}/articles/${slug}`,
    },
    inLanguage: article.language || 'en',
  };

  const heroUrl = buildImageUrl(article.featuredImage?.url, { width: 1200 });

  const categoryLabel =
    (lang !== 'en' && article.category?.nameTranslations?.[lang]) || article.category?.name;

  const breadcrumbItems = [
    { label: dict.home, href: `/${lang}` },
    ...(article.category?.slug
      ? [{ label: categoryLabel, href: `/${lang}/category/${article.category.slug}` }]
      : []),
    { label: article.title },
  ];

  return (
    <>
      {/* JSON-LD — must be server-rendered for Google News */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe({
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
        <div className="container container--article">
          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <Breadcrumb items={breadcrumbItems} />

          {/* ── Editorial Header ───────────────────────────────────────────── */}
          <header className="article-editorial-header">
            {/* Category / Breaking Badge */}
            <div className="article-badges-row">
              {article.category?.slug && (
                <Link href={`/${lang}/category/${article.category.slug}`} className="badge badge-brand">
                  {categoryLabel}
                </Link>
              )}
              {article.isBreaking && (
                <span className="badge badge-breaking" aria-label="Breaking news">
                  <Circle size={10} fill="currentColor" className="breaking-icon" /> {dict.breaking}
                </span>
              )}
            </div>

            {/* Linked translations of this story */}
            {(article.translations || []).length > 0 && (
              <div className="article-badges-row" style={{ marginTop: '0.5rem' }}>
                {article.translations.map((t) => (
                  <Link
                    key={t.language}
                    href={`/${t.language}/articles/${t.slug}`}
                    className="badge"
                    style={{ background: 'var(--color-bg-alt)' }}
                  >
                    {LANGUAGE_LABELS[t.language] || t.language} ↗
                  </Link>
                ))}
              </div>
            )}

            {/* H1 — one per page (SEO requirement) */}
            <h1 className="article-title">{article.title}</h1>

            {/* Sub-heading (Excerpt / Subtitle) */}
            {(article.excerpt || article.seo?.metaDescription) && (
              <p className="article-subtitle">{article.excerpt || article.seo?.metaDescription}</p>
            )}

            {/* Meta row */}
            <div className="article-meta-row" role="contentinfo">
              {article.author?.name && (
                <>
                  <span>{dict.by}</span>
                  <span className="article-meta-author">{article.author.name}</span>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                </>
              )}

              {article.publishedAt && (
                <>
                  <time dateTime={article.publishedAt}>
                    {dict.published}: {formatDate(article.publishedAt, undefined, lang)}
                  </time>
                </>
              )}

              {article.updatedAt && article.updatedAt !== article.publishedAt && (
                <>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                  <time dateTime={article.updatedAt}>
                    {dict.updated}: {formatDate(article.updatedAt, undefined, lang)}
                  </time>
                </>
              )}

              {article.readingTimeMinutes && (
                <>
                  <span className="article-meta-sep" aria-hidden="true">·</span>
                  <span>{article.readingTimeMinutes} {dict.minRead}</span>
                </>
              )}

              <span className="article-meta-sep" aria-hidden="true">·</span>
              <BookmarkButton slug={article.slug} showLabel={true} />
              <span className="article-meta-sep" aria-hidden="true">·</span>
              <FontSizeAdjuster />
            </div>
          </header>
        </div>

        {/* ── Featured Image (clean, no text overlays) ───────────────────── */}
        {heroUrl && (
          <div className="container container--article">
            <figure className="article-hero-wrap">
              <Image
                src={heroUrl}
                alt={article.featuredImage?.alt || article.title}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="article-hero-img"
              />

              {article.featuredImage?.alt && (
                <figcaption className="article-hero-caption sr-only">
                  {article.featuredImage.alt}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        {/* Top Share Buttons */}
        <div className="container container--article" style={{ marginBlock: '1.5rem' }}>
          <ShareButtons title={article.title} text={article.excerpt} />
        </div>

        <div id="article-content" className="article-body--md container container--article">
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
