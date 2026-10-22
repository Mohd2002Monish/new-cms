'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LOCALES = ['en', 'hi', 'gu'];

/**
 * CategoryTabStrip — horizontal scrollable tab strip with localization support.
 * All tabs are plain <a> / <Link> tags so they work without JS and are SEO-friendly.
 *
 * @param {Array}   categories    — list of category objects { name, slug, parentCategory }
 * @param {string}  activeSlug    — currently selected category slug (or null for "All")
 * @param {string}  baseHref      — base URL for "All" tab (optional override)
 */
export default function CategoryTabStrip({ categories = [], activeSlug = null, baseHref = null }) {
  const pathname = usePathname();
  const segment = pathname?.split('/')[1];
  const lang = LOCALES.includes(segment) ? segment : 'en';

  const rootHref = baseHref || `/${lang}`;

  // Filter to main categories for tab strip
  const mainCategories = categories.filter((c) => !c.parentCategory);

  // Find active category and parent if active is a subcategory
  const activeCat = categories.find((c) => c.slug === activeSlug);
  const activeParentId = activeCat?.parentCategory?._id || activeCat?.parentCategory;
  const parentOfActive = activeParentId
    ? categories.find((c) => c._id === activeParentId)
    : activeCat;

  const subcategories = parentOfActive
    ? categories.filter(
        (c) =>
          (c.parentCategory?._id || c.parentCategory) === parentOfActive._id ||
          c.parentCategory?.slug === parentOfActive.slug
      )
    : [];

  return (
    <div className="category-tabs-container">
      <nav className="category-tabs" aria-label="Filter by category">
        {/* "All" tab */}
        <Link
          href={rootHref}
          className={`category-tab ${!activeSlug ? 'active' : ''}`}
          aria-current={!activeSlug ? 'page' : undefined}
        >
          All
        </Link>

        {/* Category tabs */}
        {mainCategories.map((cat) => {
          const isActive =
            activeSlug === cat.slug ||
            (parentOfActive && parentOfActive.slug === cat.slug);

          return (
            <Link
              key={cat._id || cat.slug}
              href={`/${lang}/category/${cat.slug}`}
              className={`category-tab ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {cat.localizedName || cat.name}
            </Link>
          );
        })}
      </nav>

      {/* Subcategory pills strip */}
      {subcategories.length > 0 && (
        <div
          className="subcategory-strip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 4px 4px 4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-muted, #94a3b8)',
              paddingRight: '4px',
            }}
          >
            {parentOfActive?.name} &bull;
          </span>

          {subcategories.map((sub) => {
            const isSubActive = activeSlug === sub.slug;
            return (
              <Link
                key={sub._id || sub.slug}
                href={`/${lang}/category/${sub.slug}`}
                style={{
                  fontSize: '12px',
                  fontWeight: isSubActive ? 700 : 500,
                  padding: '3px 12px',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  backgroundColor: isSubActive
                    ? 'var(--color-brand, #dc2626)'
                    : 'var(--color-bg-alt, #f1f5f9)',
                  color: isSubActive ? '#ffffff' : 'var(--color-text-secondary, #475569)',
                  transition: 'all 0.15s ease',
                }}
              >
                {sub.localizedName || sub.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
