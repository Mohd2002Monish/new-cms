'use client';

import Link from 'next/link';
import { LogIn, Flame, Settings } from 'lucide-react';

/**
 * SidebarUserProfile — Renders the user status, reading streak, or sign-in trigger at sidebar footer
 */
export default function SidebarUserProfile({
  user,
  isLoggedIn,
  lang,
  onNavClick,
  onOpenAuth,
  onLogout,
}) {
  if (user) {
    return (
      <Link
        href={`/${lang}/history`}
        className="marketerz-user-pill"
        style={{ textDecoration: 'none', color: 'inherit' }}
        onClick={onNavClick}
      >
        <div className="avatar-fallback">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
        <div className="marketerz-user-info" style={{ flexGrow: 1, minWidth: 0 }}>
          <span className="user-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </span>
          <span className="user-email" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </span>
        </div>
        {user.readingStreak > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#f59e0b',
              padding: '2px 6px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold',
              marginRight: '8px',
              flexShrink: 0,
            }}
            title={`${user.readingStreak} day reading streak`}
          >
            <Flame size={12} fill="#f59e0b" style={{ color: '#f59e0b' }} />
            <span>{user.readingStreak}</span>
          </div>
        )}
        <button
          className="marketerz-more-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogout();
          }}
          aria-label="Sign Out"
          title="Sign Out"
          style={{ flexShrink: 0 }}
        >
          <LogIn size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </Link>
    );
  }

  if (isLoggedIn) {
    return (
      <a
        href="http://localhost:5173"
        className="marketerz-user-pill"
        style={{ textDecoration: 'none' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="avatar-fallback">A</div>
        <div className="marketerz-user-info">
          <span className="user-name">Admin Portal</span>
          <span className="user-email">Manage Portal</span>
        </div>
        <button className="marketerz-more-btn" aria-label="Settings">
          <Settings size={18} />
        </button>
      </a>
    );
  }

  return (
    <div
      className="marketerz-user-pill"
      style={{ cursor: 'pointer' }}
      onClick={onOpenAuth}
    >
      <div
        className="avatar-fallback"
        style={{ background: 'transparent', border: '1px solid currentColor', color: 'inherit' }}
      >
        <LogIn size={16} />
      </div>
      <div className="marketerz-user-info">
        <span className="user-name">Sign In</span>
        <span className="user-email">Save and react to stories</span>
      </div>
    </div>
  );
}

