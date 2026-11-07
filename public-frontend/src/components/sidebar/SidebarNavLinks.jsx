'use client';

import Link from 'next/link';
import { Home, Bookmark, Clock } from 'lucide-react';

/**
 * SidebarNavLinks — Renders dashboard, category links, saved articles, and history
 */
export default function SidebarNavLinks({
  categories = [],
  pathname,
  lang,
  onNavClick,
  user,
  bookmarks = [],
  isBookmarksLoaded,
}) {
  return (
    <div className="marketerz-scrollable">
      {/* Main Menu */}
      <nav className="marketerz-nav">
        <Link
          href={`/${lang}`}
          onClick={onNavClick}
          className={`marketerz-nav-item ${pathname === `/${lang}` ? 'active' : ''}`}
        >
          <Home className="marketerz-nav-icon" size={20} />
          <span className="marketerz-nav-label">Dashboard</span>
        </Link>

        {categories.map((cat) => {
          if (!cat.slug) return null;
          const isActive = pathname === `/${lang}/category/${cat.slug}`;
          const label = cat.localizedName || cat.name;
          return (
            <Link
              key={cat._id || cat.slug}
              href={`/${lang}/category/${cat.slug}`}
              onClick={onNavClick}
              className={`marketerz-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="marketerz-nav-icon">
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: '1.5px solid currentColor'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{label.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <span className="marketerz-nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Account Section */}
      <div className="marketerz-section">
        <h4 className="marketerz-section-title">ACCOUNT</h4>
        <nav className="marketerz-nav">
          <Link
            href={`/${lang}/saved`}
            className={`marketerz-nav-item ${pathname === `/${lang}/saved` ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Bookmark className="marketerz-nav-icon" size={20} />
            <span className="marketerz-nav-label">Saved Articles</span>
            {isBookmarksLoaded && bookmarks.length > 0 && (
              <span className="marketerz-badge yellow">{bookmarks.length}</span>
            )}
          </Link>
          {user && (
            <Link
              href={`/${lang}/history`}
              className={`marketerz-nav-item ${pathname === `/${lang}/history` ? 'active' : ''}`}
              onClick={onNavClick}
            >
              <Clock className="marketerz-nav-icon" size={20} />
              <span className="marketerz-nav-label">Reading History</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

