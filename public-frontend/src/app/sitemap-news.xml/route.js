import { publicApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  let articles = [];
  try {
    const res = await publicApi.getSitemapData({ recent: true });
    if (res.success && res.data) {
      articles = res.data;
    }
  } catch (error) {
    console.error('Failed to fetch sitemap data:', error);
  }

  const newsItems = articles.map((article) => {
    return `
  <url>
    <loc>${siteUrl}/articles/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>NewsPortal</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(article.publishedAt).toISOString()}</news:publication_date>
      <news:title><![CDATA[${article.title}]]></news:title>
      ${article.tags?.length > 0 ? `<news:keywords><![CDATA[${article.tags.join(', ')}]]></news:keywords>` : ''}
    </news:news>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsItems}
</urlset>
  `.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600', // 10 minutes cache
    },
  });
}
