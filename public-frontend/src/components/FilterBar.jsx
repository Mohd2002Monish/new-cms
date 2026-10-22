'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LOCALES = ['en', 'hi', 'gu'];

/**
 * FilterBar — horizontal scrollable pill filter strip with subcategory support.
 * Active state: red bottom-border underline only (no background fill).
 *
 * @param {Array}   categories  — list of { name, slug, parentCategory } category objects
 * @param {string}  activeSlug  — currently active slug (null = "All")
 */
export default function FilterBar({ categories = [], activeSlug = null }) {
  const pathname = usePathname();
  const segment = pathname?.split('/')[1];
  const lang = LOCALES.includes(segment) ? segment : 'en';

  const [active, setActive] = useState(activeSlug);

  useEffect(() => {
    setActive(activeSlug);
  }, [activeSlug]);

  // Segregate main categories from subcategories
  const mainCategories = categories.filter((c) => !c.parentCategory);

  // Find active category and its subcategories if any
  const activeCat = categories.find((c) => c.slug === active);
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
    <div className="filter-bar-wrapper">
      <nav className="filter-bar" aria-label="Filter articles by category">
        {/* All pill */}
        <Link
          href={`/${lang}`}
          className={`filter-pill${active === null ? ' active' : ''}`}
          onClick={() => setActive(null)}
          aria-current={active === null ? 'page' : undefined}
        >
          All
        </Link>

        {/* Main Category pills */}
        {mainCategories.map((cat) => {
          const isActive =
            active === cat.slug ||
            (parentOfActive && parentOfActive.slug === cat.slug);

          return (
            <Link
              key={cat._id || cat.slug}
              href={`/${lang}/category/${cat.slug}`}
              className={`filter-pill${isActive ? ' active' : ''}`}
              onClick={() => setActive(cat.slug)}
              aria-current={isActive ? 'page' : undefined}
            >
              {cat.localizedName || cat.name}
            </Link>
          );
        })}
      </nav>

      {/* Subcategory secondary pills strip */}
      {subcategories.length > 0 && (
        <div
          className="subcategory-strip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 4px 10px 4px',
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
            const isSubActive = active === sub.slug;
            return (
              <Link
                key={sub._id || sub.slug}
                href={`/${lang}/category/${sub.slug}`}
                onClick={() => setActive(sub.slug)}
                style={{
                  fontSize: '12px',
                  fontWeight: isSubActive ? 700 : 500,
                  padding: '3px 10px',
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
