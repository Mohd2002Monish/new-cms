import Link from 'next/link';

/**
 * CategoryTabStrip — horizontal scrollable tab strip.
 * All tabs are plain <a> / <Link> tags so they work without JS and are SEO-friendly.
 *
 * @param {Array}   categories    — list of category objects { name, slug }
 * @param {string}  activeSlug    — currently selected category slug (or null for "All")
 * @param {string}  baseHref      — base URL (default '/') for tab links
 */
export default function CategoryTabStrip({ categories = [], activeSlug = null, baseHref = '/' }) {
  return (
    <nav className="category-tabs" aria-label="Filter by category">
      {/* "All" tab */}
      <Link
        href={baseHref}
        className={`category-tab ${!activeSlug ? 'active' : ''}`}
        aria-current={!activeSlug ? 'page' : undefined}
      >
        All
      </Link>

      {/* Category tabs */}
      {categories.map((cat) => {
        const isActive = activeSlug === cat.slug;
        return (
          <Link
            key={cat._id || cat.slug}
            href={`/category/${cat.slug}`}
            className={`category-tab ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {cat.name}
          </Link>
        );
      })}
    </nav>
  );
}
