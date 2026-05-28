import { publicApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  let articles = [];
  try {
    const res = await publicApi.getSitemapData();
    if (res.success && res.data) {
      articles = res.data;
    }
  } catch (error) {
    console.error('Failed to fetch sitemap data:', error);
  }

  const urlItems = articles.map((article) => {
    return `
  <url>
    <loc>${siteUrl}/articles/${article.slug}</loc>
    <lastmod>${new Date(article.updatedAt || article.publishedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlItems}
</urlset>
  `.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
    },
  });
}
