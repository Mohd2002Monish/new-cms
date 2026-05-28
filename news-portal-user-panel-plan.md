# News Portal — User Panel Feature Plan
### Scope: Public Reader-Facing Frontend (React + Node/Express backend additions)

> This document covers every feature the public reader sees and interacts with.
> Admin panel features (audit logs, scheduling, versioning etc.) are already covered in the previous plan.
> Backend additions here are only what is needed to serve the public panel.

---

## Table of Contents
1. [Priority Matrix](#priority-matrix)
2. [Phase 1 — Public Article Pages](#phase-1--public-article-pages)
3. [Phase 2 — Homepage & Category Feeds](#phase-2--homepage--category-feeds)
4. [Phase 3 — Search](#phase-3--search)
5. [Phase 4 — SEO & Structured Data](#phase-4--seo--structured-data)
6. [Phase 5 — Performance (Core Web Vitals)](#phase-5--performance-core-web-vitals)
7. [Phase 6 — Dark Mode & Reading Preferences](#phase-6--dark-mode--reading-preferences)
8. [Phase 7 — Breaking News & Live Ticker](#phase-7--breaking-news--live-ticker)
9. [Phase 8 — Reader Engagement (Reactions & Comments)](#phase-8--reader-engagement-reactions--comments)
10. [Phase 9 — Save / Bookmark Articles](#phase-9--save--bookmark-articles)
11. [Phase 10 — Social Sharing](#phase-10--social-sharing)
12. [Phase 11 — Related Articles & Recommendations](#phase-11--related-articles--recommendations)
13. [Phase 12 — PWA (Progressive Web App)](#phase-12--pwa-progressive-web-app)
14. [Phase 13 — Accessibility](#phase-13--accessibility)
15. [Recommended Libraries](#recommended-libraries)
16. [Backend API Additions Summary](#backend-api-additions-summary)

---

## Priority Matrix

| Phase | Feature | Effort | Impact | Priority |
|-------|---------|--------|--------|----------|
| 1 | Article Pages | Low | Critical | ✅ Do First |
| 2 | Homepage & Category Feeds | Low | Critical | ✅ Do First |
| 3 | Search | Medium | High | ✅ Do First |
| 4 | SEO & Structured Data | Medium | Critical | ✅ Do First |
| 5 | Performance / Core Web Vitals | Medium | Critical | ✅ Do First |
| 6 | Dark Mode & Reading Prefs | Low | High | After Phase 5 |
| 7 | Breaking News Ticker | Low | High | After Phase 6 |
| 8 | Comments & Reactions | High | High | After Phase 7 |
| 9 | Save / Bookmarks | Medium | Medium | After Phase 8 |
| 10 | Newsletter | Medium | High | After Phase 9 |
| 11 | RSS Feed | Low | Medium | After Phase 10 |
| 12 | Social Sharing | Low | Medium | After Phase 11 |
| 13 | Related Articles | Medium | High | After Phase 12 |
| 14 | PWA | Medium | High | After Phase 13 |
| 15 | Accessibility | Ongoing | Critical | Parallel to all |

> **Note:** Phases 1–5 are non-negotiable foundations. Do not build Phase 6+ until these are solid.

---

## Phase 1 — Public Article Pages

This is the core product. Everything else links back to it.

### What to build

**URL structure:**
```
/articles/:slug          — Single article page
/category/:slug          — Category listing page
/author/:id              — Author profile + article list (optional, add later)
```

### Article Page layout (top to bottom)

```
[ Breadcrumb: Home > Category > Article Title ]
[ BREAKING badge (if isBreaking) ]
[ Article Title (H1) ]
[ Meta row: Author name | Date published | Updated date | Reading time | Category ]
[ Hero Image + caption + credit ]
[ Share buttons strip (horizontal) ]
[ Article Body (rendered from Tiptap JSON) ]
[ Tags row ]
[ Author bio card ]
[ Share buttons strip (repeated at bottom) ]
[ Comments section ]
[ Related Articles ]
```

### Reading Time Estimate

Calculate on the backend when a post is published. Store in the Post schema.

```js
// Add to Post schema
readingTimeMinutes: { type: Number }

// Calculate on save (average reading speed: 200 words/minute)
function calcReadingTime(tiptapJson) {
  const text = extractTextFromTiptapJSON(tiptapJson);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / 200);
}
```

Display as: `5 min read`

### Tiptap JSON Renderer

Your CMS already uses Tiptap. The public frontend must render the same JSON.

- Install `@tiptap/react` and the same extensions used in the editor on the frontend
- Use Tiptap's read-only mode (`editable: false`)
- Apply your public website's CSS — the WYSIWYG preview in the editor already does this, so reuse that CSS file

### Published Date & Updated Date

Always show both if an article has been updated:
```
Published: May 10, 2026  |  Updated: May 22, 2026
```
This is important for Google News — it signals content freshness.

### Backend API

```
GET /api/public/articles/:slug     — Single published article by slug
GET /api/public/articles           — List published articles (paginated)
  Query params: category, tag, author, page, limit, sort (latest | popular)
GET /api/public/categories         — All active categories
GET /api/public/tags               — All tags (for tag cloud / filter)
```

All public routes must:
- Only return `status: 'published'` articles
- Strip internal fields (`approvedBy`, `rejectedReason`, `revisions` etc.)
- Return denormalized author name and category name (no extra round trips)

---

## Phase 2 — Homepage & Category Feeds

### Homepage sections

```
[ Breaking News Ticker ]                       ← Phase 7
[ Hero / Featured Stories — 3 large cards ]
[ Latest News Grid — infinite scroll or paginated ]
[ Category strip tabs: All | Politics | Sports | Tech … ]
[ Trending Stories sidebar (by view count) ]
[ Newsletter signup widget ]                   ← Phase 10
```

### Card design (each article card must show)

- Thumbnail (with aspect ratio 16:9, cropped to focal point from Phase 11 media library)
- Category badge
- Headline
- Short description (meta description or first 120 chars of body)
- Author name
- Published date (relative: "2 hours ago")
- Reading time
- BREAKING badge if applicable

### Infinite Scroll vs Pagination

Use **pagination** for SEO — infinite scroll content is harder for Google to index. Use "Load More" button as a middle ground (appends to page without URL change).

### View Count Tracking

Add a view counter to the Post schema for "Trending" sorting:

```js
// Add to Post schema
viewCount: { type: Number, default: 0 }
```

```
POST /api/public/articles/:slug/view   — Increment view count (debounce: once per IP per hour)
```

Use Redis or a simple TTL-based approach in MongoDB to deduplicate views per IP.

### Category Feed Pages

`/category/politics` should be a standard listing page with:
- Category title + description (add `description` field to Category schema)
- Same article card grid as homepage
- Pagination

---

## Phase 3 — Search

### What readers expect from search
- Instant results as they type (debounced, ~400ms)
- Results ranked by relevance, then recency
- Highlight matched keywords in results
- Filter by category and date range

### Implementation Options

**Option A — MongoDB Atlas Full Text Search (Recommended for your stack)**

You're already on MongoDB Atlas. Atlas Search uses Lucene under the hood and is free on M10+ clusters.

```js
// Create an Atlas Search index on the posts collection
// Fields: title (weight: 10), metaDescription (weight: 5), content (weight: 1), tags (weight: 3)
```

```
GET /api/public/search?q=india+election&category=politics&from=2026-01-01&page=1
```

**Option B — Algolia (if Atlas Search is insufficient at scale)**

Algolia gives autocomplete, typo tolerance, and faceted filtering out of the box. Sync your published posts to Algolia on publish/update/delete.

Start with Atlas Search. Migrate to Algolia if you hit limits.

### Search Results Page

```
[ Search bar (with query pre-filled) ]
[ Result count: "47 results for 'india election'" ]
[ Filters: Category | Date Range ]
[ Article cards list (title highlighted, snippet highlighted) ]
[ Pagination ]
```

---

## Phase 4 — SEO & Structured Data

This is the most important phase for traffic. Research confirms structured data is critical for Google News and AI Overview citations.

### Per-article HTML head tags

Every article page must server-render (SSR or SSG) the following in `<head>`:

```html
<!-- Basic -->
<title>{seo.metaTitle || article.title}</title>
<meta name="description" content="{seo.metaDescription}">
<link rel="canonical" href="{seo.canonicalUrl || current URL}">
{#if seo.noIndex}<meta name="robots" content="noindex,nofollow">{/if}

<!-- Open Graph (Facebook, WhatsApp, LinkedIn previews) -->
<meta property="og:type" content="article">
<meta property="og:title" content="{seo.ogTitle || article.title}">
<meta property="og:description" content="{seo.ogDescription || seo.metaDescription}">
<meta property="og:image" content="{seo.ogImage || article.heroImage}">
<meta property="og:url" content="{canonical URL}">
<meta property="og:site_name" content="Your Publication Name">
<meta property="article:published_time" content="{article.publishedAt ISO8601}">
<meta property="article:modified_time" content="{article.updatedAt ISO8601}">
<meta property="article:author" content="{author name}">
<meta property="article:section" content="{category name}">

<!-- Twitter / X Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{ogImage}">
```

### JSON-LD Structured Data

Inject a `<script type="application/ld+json">` block on every article page.

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Article title here",
  "image": ["https://cdn.example.com/hero.jpg"],
  "datePublished": "2026-05-10T08:00:00+05:30",
  "dateModified": "2026-05-22T14:30:00+05:30",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "NewsMediaOrganization",
    "name": "Your Publication",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "description": "Meta description here",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/articles/slug-here"
  }
}
```

> **Critical note from research:** For news sites, structured data must be in the server-rendered HTML — not injected by JavaScript after load. Google's crawler reads the initial HTML for news. If you're using React (client-side), you MUST use SSR (Next.js) or a meta-tag injection library like `react-helmet` with SSR.

### XML Sitemaps

Google News requires a dedicated News Sitemap that is updated every time an article is published.

```
/sitemap.xml          — General sitemap (all pages)
/sitemap-news.xml     — Google News sitemap (articles from last 2 days only)
/sitemap-articles.xml — Full article sitemap (all published articles, paginated)
```

**News sitemap format:**
```xml
<url>
  <loc>https://example.com/articles/article-slug</loc>
  <news:news>
    <news:publication>
      <news:name>Your Publication</news:name>
      <news:language>en</news:language>
    </news:publication>
    <news:publication_date>2026-05-22T09:00:00+05:30</news:publication_date>
    <news:title>Article Title Here</news:title>
    <news:keywords>politics, election, india</news:keywords>
  </news:news>
</url>
```

**Generate dynamically via backend route:**
```
GET /sitemap-news.xml      — Articles published in last 48 hours
GET /sitemap-articles.xml  — All published articles
```

### BreadcrumbList Schema

Add to every article and category page:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Politics", "item": "https://example.com/category/politics" },
    { "@type": "ListItem", "position": 3, "name": "Article Title" }
  ]
}
```

---

## Phase 5 — Performance (Core Web Vitals)

Research shows only 48% of mobile pages pass all Core Web Vitals in 2025. For a news site competing for Google News placement, this is non-negotiable.

### The three targets (as of 2026)

| Metric | Target | What it measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.0s | How fast the hero image/headline loads |
| INP (Interaction to Next Paint) | < 200ms | How fast the page responds to clicks |
| CLS (Cumulative Layout Shift) | < 0.1 | How stable the layout is while loading |

### Implementation checklist

**Images**
- [ ] All images served via Cloudinary CDN (already done)
- [ ] Use `<img loading="lazy">` for below-fold images
- [ ] Use `fetchpriority="high"` on the hero image (above fold)
- [ ] Always specify `width` and `height` attributes on images (prevents CLS)
- [ ] Serve WebP format via Cloudinary transformation URL
- [ ] Hero image minimum 696px wide (Google News requirement)

**Fonts**
- [ ] Use `font-display: swap` in CSS
- [ ] Preload critical fonts: `<link rel="preload" as="font">`
- [ ] Limit to 2 font families maximum

**JavaScript**
- [ ] Code-split routes with `React.lazy()` + `Suspense`
- [ ] Never block rendering with synchronous scripts in `<head>`
- [ ] Defer non-critical scripts (analytics, ads)

**React SSR Consideration**
- [ ] If using plain Vite/React (client-side only), Google will struggle to index article content
- [ ] **Strongly recommended:** Migrate public portal to **Next.js** for SSR/SSG
- [ ] Keep your existing Vite/React admin panel as-is (no SEO needed for admin)
- [ ] The backend API stays the same — Next.js just calls it on the server side

**Caching**
- [ ] Cache article API responses (Redis or in-memory, 60-second TTL for published articles)
- [ ] Set `Cache-Control` headers on article API: `public, max-age=60, stale-while-revalidate=300`
- [ ] CDN in front of your server (Cloudflare free tier works fine)

---

## Phase 6 — Dark Mode & Reading Preferences

Research shows nearly 82% of smartphone users prefer dark mode. This is a high-impact, low-effort feature.

### Features to build

**Dark Mode**
- Toggle button in navbar (sun/moon icon)
- Persist preference in `localStorage`
- Also respect system preference by default: `prefers-color-scheme: dark`
- Implement via CSS custom properties (variables) — single toggle on `<html data-theme="dark">`

**Font Size Adjuster**
- Three sizes: Small / Medium / Large
- Persist in localStorage
- Apply via CSS class on article body: `.article-body--sm`, `.article-body--md`, `.article-body--lg`

**Reading Progress Bar**
- Thin bar at the top of the page that fills as the reader scrolls
- Shows completion percentage
- Simple `scroll` event listener + CSS width update

### No backend needed for this phase. Fully client-side.

---

## Phase 7 — Breaking News & Live Ticker

Your admin panel already sets `isBreaking` and `breakingExpiresAt` on posts. Now you need to display it.

### Ticker Component

A horizontally scrolling strip at the very top of every page:

```
🔴 BREAKING  |  PM Modi visits Kashmir  ▸  Sensex drops 800 points  ▸  India beats Pakistan by 6 wickets
```

**Backend route:**
```
GET /api/public/articles/breaking     — Returns all isBreaking: true articles whose breakingExpiresAt has not passed
```

**Frontend:**
- Auto-refreshes every 60 seconds (polling, no WebSocket needed yet)
- Each item is clickable and links to the article
- CSS marquee or JS-driven scroll animation

### Breaking Badge on Cards

Any article card where `isBreaking: true` shows a red `BREAKING` badge overlaid on the thumbnail.

---

## Phase 8 — Reader Engagement (Reactions & Comments)

Research from Chartbeat found that engagement time on articles with comment interaction is higher. This phase is high effort but high reward.

### Reactions (no login required)

Simple emoji reactions below each article. No account needed — tracked by IP + article combination in a session.

```js
// Collection: article_reactions
{
  articleId: ObjectId,
  ip: String,           // Hashed for privacy
  reaction: String,     // 'like' | 'love' | 'wow' | 'angry' | 'sad'
  createdAt: Date
}
```

```
POST /api/public/articles/:id/react    — Body: { reaction: 'like' }
GET  /api/public/articles/:id/reactions — Returns count per reaction type
```

Display as: 👍 1.2k  ❤️ 843  😮 201

### Comments

**Option A — Build your own (simple, full control)**

```js
// Collection: article_comments
{
  articleId: ObjectId,
  parentId: ObjectId | null,   // null = top-level, ObjectId = reply
  authorName: String,          // No auth required for readers
  authorEmail: String,         // For Gravatar, not displayed
  body: String,
  isApproved: { type: Boolean, default: false },  // Moderated before display
  ipAddress: String,           // For spam detection
  createdAt: Date
}
```

**Moderation:** Admin and Manager can approve/reject comments from the admin panel. Add a "Pending Comments" badge to the admin nav.

**Option B — Disqus or Hyvor Talk (embedded, zero build time)**

Disqus is free but injects ads. Hyvor Talk is paid but clean. For a production newsroom, a third-party comment system saves months of moderation tooling.

**Recommendation:** Start with Hyvor Talk embed for speed. Build your own only if you need full data ownership.

**API routes (if building own):**
```
POST /api/public/articles/:id/comments          — Submit comment (pending approval)
GET  /api/public/articles/:id/comments          — Get approved comments (paginated)
POST /api/public/articles/:id/comments/:cid/reply — Reply to a comment
```

---

## Phase 9 — Save / Bookmark Articles

Readers can save articles to read later without creating an account (guest), or synced to their account (registered reader).

### Guest bookmarks (no login)

Store in `localStorage` as an array of article slugs. Render a "Saved" page that fetches those articles from the API.

```js
// localStorage key: 'bookmarks'
// Value: ['article-slug-1', 'article-slug-2']
```

```
GET /api/public/articles?slugs=slug1,slug2     — Fetch multiple articles by slug list
```

### Registered Reader (optional, add later)

If you decide to add reader accounts (email + password, simple), bookmarks sync to a `reader_bookmarks` collection. Skip this for v1 — localStorage is sufficient.

### UI

- Bookmark icon (outline) on every article card and at the top of article pages
- Filled icon when bookmarked
- `/saved` page showing all bookmarked articles

---

## Phase 10 — Newsletter Subscription

Research shows newsletters are one of the top retention tools for news sites. Readers who subscribe return 3-4x more often.

### Simple email capture

No reader account needed. Just email + optional name.

```js
// Collection: newsletter_subscribers
{
  email: { type: String, unique: true },
  name: String,
  subscribedAt: Date,
  isActive: { type: Boolean, default: true },
  unsubscribeToken: String,    // UUID for one-click unsubscribe
  tags: [String],              // e.g. ['politics', 'sports'] for segmentation
}
```

**API routes:**
```
POST /api/public/newsletter/subscribe      — Body: { email, name, tags[] }
GET  /api/public/newsletter/unsubscribe    — Query: { token } (one-click unsubscribe link)
```

**Admin panel addition:** A "Subscribers" page under Admin showing subscriber count, growth chart, and CSV export button.

### Email sending

Use your existing SendGrid/Nodemailer setup. Create a weekly digest job (extend your `node-cron` setup) that:
1. Pulls published articles from the last 7 days
2. Builds an HTML email (simple template, top 5 articles by view count)
3. Sends to all active subscribers

**Library for email templates:** `mjml` — produces bulletproof HTML email markup from a clean syntax.

---

## Phase 11 — RSS Feed

RSS still has ~50 million active users globally as of 2025. It's also how Google Discover and news aggregators ingest content.

### Routes to build

```
GET /rss.xml                   — Latest 20 published articles (all categories)
GET /rss/:categorySlug.xml     — Category-specific RSS feed
```

### Feed format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Your Publication</title>
    <link>https://example.com</link>
    <description>Latest news from Your Publication</description>
    <language>en-IN</language>
    <atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>Article Title</title>
      <link>https://example.com/articles/slug</link>
      <description><![CDATA[ Meta description here ]]></description>
      <pubDate>Wed, 22 May 2026 09:00:00 +0530</pubDate>
      <guid isPermaLink="true">https://example.com/articles/slug</guid>
      <category>Politics</category>
      <media:content url="https://cdn.cloudinary.com/hero.jpg" medium="image"/>
      <author>editor@example.com (Author Name)</author>
    </item>
  </channel>
</rss>
```

**Library:** `rss` npm package (lightweight, no bloat)

```
npm install rss
```

Add a `<link rel="alternate" type="application/rss+xml" href="/rss.xml">` tag in your site's `<head>` — this is how RSS readers auto-discover feeds.

---

## Phase 12 — Social Sharing

### Share buttons on each article

Display sharing options for:
- WhatsApp (biggest in India — `https://wa.me/?text={title} {url}`)
- Twitter/X (`https://twitter.com/intent/tweet?text={title}&url={url}`)
- Facebook (`https://www.facebook.com/sharer/sharer.php?u={url}`)
- LinkedIn (`https://www.linkedin.com/sharing/share-offsite/?url={url}`)
- Copy Link (clipboard API)
- Native Share (Web Share API for mobile browsers)

```js
// Web Share API — shows native share sheet on mobile
if (navigator.share) {
  await navigator.share({ title: article.title, url: window.location.href });
} else {
  // Fallback: show share button strip
}
```

### No backend needed for this phase.

### Share count tracking (optional)

Track share button clicks in your audit system or a simple `shareCount` field on the Post schema. Don't bother fetching real social counts — those APIs are rate-limited and slow.

---

## Phase 13 — Related Articles & Recommendations

This keeps readers on the site longer after finishing an article.

### Logic (in priority order)

1. **Same category + shared tags** — "You might also like" section (3-4 articles)
2. **Same category, recent** — fallback if tag overlap is insufficient
3. **Trending** — fallback to top viewed articles of the week

### Backend route

```
GET /api/public/articles/:id/related    — Returns 4 related articles

// Implementation:
// 1. Find articles sharing >= 1 tag with current article, same category, published, not the current article
// 2. Sort by: tag overlap count DESC, publishedAt DESC
// 3. Limit to 4
// 4. Fallback to same-category recent if < 4 results
```

### UI placement

- Below the article body, before comments
- Card grid: 2 columns on mobile, 4 on desktop
- Label: "More from [Category Name]" or "You might also like"

---

## Phase 14 — PWA (Progressive Web App)

A PWA lets readers install your news portal to their home screen on Android and iOS, and receive push notifications.

### What PWA enables

- "Add to Home Screen" prompt on mobile
- Offline reading of cached articles
- Push notifications for breaking news (future)
- Faster return visits (app shell caches)

### Implementation

**Step 1 — Web App Manifest**

Create `/public/manifest.json`:
```json
{
  "name": "Your Publication",
  "short_name": "YourPub",
  "description": "Latest news from Your Publication",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#cc0000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2 — Service Worker**

Use `vite-plugin-pwa` (if staying on Vite) or Next.js PWA plugin.

```
npm install vite-plugin-pwa
```

Cache strategy for news:
- App shell (HTML, CSS, JS): `CacheFirst`
- Article API responses: `NetworkFirst` with 60-second fallback (you want fresh news)
- Images: `CacheFirst` with 7-day max

**Step 3 — Push Notifications (Breaking News)**

Requires a separate push notification service. Options:
- `web-push` npm package + VAPID keys (self-hosted, free)
- Firebase Cloud Messaging (free, reliable)

Start with Firebase Cloud Messaging. Save the subscription tokens in a `push_subscriptions` collection. When Admin marks a post as Breaking, trigger a push notification broadcast.

---

## Phase 15 — Accessibility

Accessibility is not optional — it is a legal requirement in many regions and expands your audience.

### Checklist (implement from day one, not as an afterthought)

**Semantic HTML**
- [ ] One `<h1>` per page (the article title)
- [ ] Correct heading hierarchy: H1 → H2 → H3 (never skip levels)
- [ ] Use `<article>`, `<nav>`, `<main>`, `<aside>`, `<footer>` correctly
- [ ] All images have meaningful `alt` text (pulled from `altText` field in media library)

**Keyboard Navigation**
- [ ] All interactive elements (buttons, links, modals) reachable via Tab key
- [ ] Visible focus ring on all focusable elements (never `outline: none` without a replacement)
- [ ] Modal dialogs trap focus when open, return focus on close

**Color & Contrast**
- [ ] Body text must meet WCAG AA: 4.5:1 contrast ratio minimum
- [ ] Large text (headlines, 18px+): 3:1 minimum
- [ ] Never rely on color alone to convey information (e.g. "BREAKING in red" — also needs a text label)

**ARIA**
- [ ] `aria-label` on icon-only buttons (e.g. bookmark, share)
- [ ] `aria-live="polite"` on the breaking news ticker
- [ ] `role="alert"` on error/success toast messages

**Testing tools**
- Axe DevTools (browser extension) — run on every new page
- Lighthouse Accessibility score target: 90+
- Screen reader test: NVDA (Windows, free) or VoiceOver (macOS/iOS built-in)

---

## Recommended Libraries

### Frontend (React / Next.js)

| Purpose | Library | Notes |
|---------|---------|-------|
| SSR / SEO | `Next.js` | Migrate public portal from Vite to Next.js |
| Meta tags / Head | `next/head` or `react-helmet-async` | Server-rendered meta tags |
| Tiptap renderer | `@tiptap/react` | Read-only mode, same extensions as editor |
| Date formatting | `date-fns` | "2 hours ago", ISO8601 formatting |
| Dark mode | `next-themes` | Zero-config dark mode with SSR support |
| PWA | `next-pwa` or `vite-plugin-pwa` | Service worker + manifest |
| Reading progress | Custom hook (5 lines) | No library needed |
| Comment embed | `Hyvor Talk` or build own | Hyvor = paid, no ads |
| Email template | `mjml` | Newsletter HTML generation |
| RSS generation | `rss` npm package | Lightweight |
| Search (self-hosted) | MongoDB Atlas Search | Already on Atlas |
| Search (external) | `Algolia` | Better autocomplete at scale |
| Clipboard | Browser API | No library needed |
| Share | Web Share API | Native, no library |
| Image optimization | Cloudinary SDK + `next/image` | Already on Cloudinary |
| Analytics | `Google Analytics 4` or `Plausible` | Plausible = privacy-first, no cookie consent needed |

### Backend (additions to existing Express app)

| Purpose | Library | Notes |
|---------|---------|-------|
| RSS generation | `rss` | Simple, reliable |
| Email newsletter | `mjml` + `@sendgrid/mail` | Already have SendGrid |
| Push notifications | `web-push` or Firebase Admin SDK | For PWA push |
| Search index | MongoDB Atlas Search | No extra service |
| HTML sanitization | `dompurify` + `isomorphic-dompurify` | Sanitize comment HTML |
| Spam detection | `akismet` npm or manual IP rate limit | For comment spam |

---

## Backend API Additions Summary

All of these are new routes on your existing Express backend, added under `/api/public/` (no auth required).

```
GET  /api/public/articles                        — List published (paginated, filterable)
GET  /api/public/articles/:slug                  — Single article by slug
GET  /api/public/articles/:id/related            — Related articles
GET  /api/public/articles/breaking               — Currently breaking articles
POST /api/public/articles/:slug/view             — Increment view count
POST /api/public/articles/:id/react              — Add reaction
GET  /api/public/articles/:id/reactions          — Get reaction counts
POST /api/public/articles/:id/comments           — Submit comment (pending)
GET  /api/public/articles/:id/comments           — Get approved comments
POST /api/public/articles/:id/comments/:cid/reply— Reply to comment
GET  /api/public/categories                      — All active categories
GET  /api/public/search?q=...                    — Full text search
POST /api/public/newsletter/subscribe            — Subscribe to newsletter
GET  /api/public/newsletter/unsubscribe          — Unsubscribe via token
GET  /rss.xml                                    — Global RSS feed
GET  /rss/:categorySlug.xml                      — Category RSS feed
GET  /sitemap.xml                                — General sitemap
GET  /sitemap-news.xml                           — Google News sitemap (last 48 hrs)
GET  /sitemap-articles.xml                       — Full article sitemap
```

---

## Schema Additions to Existing Posts Model

```js
// Add these fields to your existing Post schema
viewCount:           { type: Number, default: 0 },
readingTimeMinutes:  { type: Number },
```

## New Collections Needed

| Collection | Phase | Purpose |
|-----------|-------|---------|
| `article_reactions` | 8 | Emoji reactions per article per IP |
| `article_comments` | 8 | Reader comments (if building own) |
| `newsletter_subscribers` | 10 | Email subscription list |
| `push_subscriptions` | 14 | PWA push notification tokens |

---

## Critical Decision: Vite vs Next.js for Public Panel

This is the most important architectural decision for the user panel.

| Factor | Vite/React (current) | Next.js |
|--------|---------------------|---------|
| SEO / Google News | ❌ Poor — JS renders content after load | ✅ Excellent — HTML pre-rendered |
| Structured Data | ❌ Hard to inject server-side | ✅ Native |
| News Sitemap | ✅ Backend handles it | ✅ Backend handles it |
| Build complexity | ✅ Simple | ⚠️ Moderate |
| Your admin panel | ✅ Keep as Vite | ✅ Keep as Vite |
| Time to migrate | — | ~1-2 weeks |

**Recommendation:** Build the public portal as a separate Next.js app. Keep the admin panel on Vite. Both talk to the same Express API. This is the standard architecture for newsrooms of your scale.

---

*Admin panel is already complete per Phase 1–12 of the previous execution plan.*
*Start this plan with Phase 1 (Article Pages) and Phase 4 (SEO) in parallel.*
*Never skip Phase 5 (Performance) — it directly determines Google News eligibility.*
