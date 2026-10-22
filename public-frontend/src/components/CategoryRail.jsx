'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Monitor, TrendingUp, Film, Trophy, Landmark, Newspaper } from 'lucide-react';
import DashboardCard from './DashboardCard';

const LOCALES = ['en', 'hi', 'gu'];

/** Maps category name to an emoji icon for the rail header */
function getCategoryIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('tech'))                              return <Monitor size={18} />;
  if (n.includes('business') || n.includes('finance')) return <TrendingUp size={18} />;
  if (n.includes('entertain'))                         return <Film size={18} />;
  if (n.includes('sport'))                             return <Trophy size={18} />;
  if (n.includes('politi'))                            return <Landmark size={18} />;
  return <Newspaper size={18} />;
}

/**
 * CategoryRail — one horizontal rail per category with a 3-column card grid.
 *
 * @param {object} category  — { name, slug, subcategories }
 * @param {Array}  articles  — up to 3 articles for this category
 */
export default function CategoryRail({ category, articles = [] }) {
  const pathname = usePathname();
  const segment = pathname?.split('/')[1];
  const lang = LOCALES.includes(segment) ? segment : 'en';

  if (!articles.length) return null;

  const icon = getCategoryIcon(category?.name);
  const subcategories = category?.subcategories || [];

  return (
    <section className="category-rail" aria-labelledby={`rail-${category?.slug}`}>
      {/* Rail header */}
      <div className="rail-header">
        <div className="rail-header-left">
          <div className="rail-accent-bar" aria-hidden="true" />
          <div className="rail-icon" aria-hidden="true">{icon}</div>
          <h2 id={`rail-${category?.slug}`} className="rail-title">
            {category?.nameTranslations?.[lang] || category?.localizedName || category?.name}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Subcategory chips */}
          {subcategories.length > 0 && (
            <div className="rail-subcategories" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {subcategories.slice(0, 3).map((sub) => (
                <Link
                  key={sub._id || sub.slug}
                  href={`/${lang}/category/${sub.slug}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-bg-alt, #f1f5f9)',
                    color: 'var(--color-text-secondary, #64748b)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sub.nameTranslations?.[lang] || sub.localizedName || sub.name}
                </Link>
              ))}
            </div>
          )}

          <Link
            href={`/${lang}/category/${category?.slug}`}
            className="view-more-btn"
            aria-label={`View more ${category?.name} articles`}
          >
            {lang === 'hi' ? 'और देखें' : lang === 'gu' ? 'વધુ જુઓ' : 'View More'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Card grid — 3 columns */}
      <div className="rail-card-grid">
        {articles.slice(0, 3).map((article, idx) => (
          <DashboardCard
            key={article._id || article.slug}
            article={article}
            priority={idx === 0}
          />
        ))}
      </div>
    </section>
  );
}
