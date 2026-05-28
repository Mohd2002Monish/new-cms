import { publicApi } from '@/lib/api';
import ArticleCard from './ArticleCard';

export default async function RelatedArticles({ slug, categoryName }) {
  let related = [];
  try {
    const res = await publicApi.getRelatedArticles(slug);
    if (res?.success) {
      related = res.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch related articles:', err);
  }

  if (related.length === 0) return null;

  return (
    <div className="related-articles-section">
      <h3 className="section-title">
        More from {categoryName || 'this category'}
      </h3>
      <div className="related-articles-grid">
        {related.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>
    </div>
  );
}
