'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * FilterBar — horizontal scrollable pill filter strip.
 * Active state: red bottom-border underline only (no background fill).
 *
 * @param {Array}   categories  — list of { name, slug } category objects
 * @param {string}  activeSlug  — currently active slug (null = "All")
 */
export default function FilterBar({ categories = [], activeSlug = null }) {
  const [active, setActive] = useState(activeSlug);

  return (
    <nav className="filter-bar" aria-label="Filter articles by category">
      {/* All pill */}
      <Link
        href="/"
        className={`filter-pill${active === null ? ' active' : ''}`}
        onClick={() => setActive(null)}
        aria-current={active === null ? 'page' : undefined}
      >
        All
      </Link>

      {/* Category pills */}
      {categories.map((cat) => {
        const isActive = active === cat.slug;
        return (
          <Link
            key={cat._id || cat.slug}
            href={`/category/${cat.slug}`}
            className={`filter-pill${isActive ? ' active' : ''}`}
            onClick={() => setActive(cat.slug)}
            aria-current={isActive ? 'page' : undefined}
          >
            {cat.name}
          </Link>
        );
      })}
    </nav>
  );
}
