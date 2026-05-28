import Link from 'next/link';

/**
 * Breadcrumb — renders a BreadcrumbList for both display and SEO JSON-LD.
 *
 * @param {Array<{label: string, href?: string}>} items
 *   Last item should have no href (it's the current page).
 */
export default function Breadcrumb({ items = [] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* JSON-LD for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Visual breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="breadcrumb-item">
              {index > 0 && (
                <span className="breadcrumb-sep" aria-hidden="true"> / </span>
              )}
              {isLast || !item.href ? (
                <span
                  className="breadcrumb-current"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
