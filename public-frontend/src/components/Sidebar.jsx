'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search,
  Bookmark,
  Settings,
  LogIn,
  Flame,
  Clock
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  
  // Hooks for actual functionality
  const { bookmarks, isLoaded } = useBookmarks();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, openAuthModal, logout: readerLogout } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check auth status from admin panel localStorage
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
    }
    
    async function loadCats() {
      try {
        const response = await publicApi.getCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCats();
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Prevent hydration mismatch for theme toggle
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`marketerz-sidebar ${isOpen ? '' : 'closed'}`}>
        
        {/* Header */}
        <div className="marketerz-header">
          <Link href="/" className="marketerz-brand" onClick={() => setIsOpen(false)}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', 
              backgroundColor: '#ffffff', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ color: '#dc2626', fontWeight: 900, fontSize: '18px', lineHeight: 1 }}>N</span>
            </div>
            <span className="marketerz-brand-text" style={{ color: '#ffffff' }}>
              NewsPortal
            </span>
          </Link>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/search" className="marketerz-icon-btn" onClick={() => setIsOpen(false)} aria-label="Search">
              <Search size={20} />
            </Link>
            <button className="marketerz-icon-btn mobile-close" onClick={toggleSidebar} aria-label="Close sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Theme Toggle Pill */}
        <div className="marketerz-toggle-pill">
          <button 
            className={`marketerz-toggle-btn ${!isDark ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            LIGHT
          </button>
          <button 
            className={`marketerz-toggle-btn ${isDark ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            DARK
          </button>
        </div>

        <div className="marketerz-scrollable">
          {/* Main Menu */}
          <nav className="marketerz-nav">
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)}
              className={`marketerz-nav-item ${pathname === '/' ? 'active' : ''}`}
            >
              <Home className="marketerz-nav-icon" size={20} />
              <span className="marketerz-nav-label">Dashboard</span>
            </Link>

            {categories.map((cat) => {
              const isActive = pathname === `/category/${cat.slug}`;
              return (
                <Link
                  key={cat._id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setIsOpen(false)}
                  className={`marketerz-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="marketerz-nav-icon">
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '20px', height: '20px', borderRadius: '4px',
                      border: '1.5px solid currentColor'
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{cat.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <span className="marketerz-nav-label">{cat.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Account Section */}
          <div className="marketerz-section">
            <h4 className="marketerz-section-title">ACCOUNT</h4>
            <nav className="marketerz-nav">
              <Link href="/saved" className={`marketerz-nav-item ${pathname === '/saved' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
                <Bookmark className="marketerz-nav-icon" size={20} />
                <span className="marketerz-nav-label">Saved Articles</span>
                {isLoaded && bookmarks.length > 0 && (
                  <span className="marketerz-badge yellow">{bookmarks.length}</span>
                )}
              </Link>
              {user && (
                <Link href="/history" className={`marketerz-nav-item ${pathname === '/history' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
                  <Clock className="marketerz-nav-icon" size={20} />
                  <span className="marketerz-nav-label">Reading History</span>
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="marketerz-footer">
          {user ? (
            <Link href="/history" className="marketerz-user-pill" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setIsOpen(false)}>
              <div className="avatar-fallback">{user.name.charAt(0).toUpperCase()}</div>
              <div className="marketerz-user-info" style={{ flexGrow: 1, minWidth: 0 }}>
                <span className="user-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <span className="user-email" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
              </div>
              {user.readingStreak > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#f59e0b',
                  padding: '2px 6px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                  marginRight: '8px', flexShrink: 0
                }} title={`${user.readingStreak} day reading streak`}>
                  <Flame size={12} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                  <span>{user.readingStreak}</span>
                </div>
              )}
              <button 
                className="marketerz-more-btn" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); readerLogout(); }} 
                aria-label="Sign Out"
                title="Sign Out"
                style={{ flexShrink: 0 }}
              >
                <LogIn size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </Link>
          ) : isLoggedIn ? (
            <a href="/user" className="marketerz-user-pill" style={{ textDecoration: 'none' }}>
              <div className="avatar-fallback">A</div>
              <div className="marketerz-user-info">
                <span className="user-name">Admin Portal</span>
                <span className="user-email">Manage Portal</span>
              </div>
              <button className="marketerz-more-btn" aria-label="Settings">
                <Settings size={18} />
              </button>
            </a>
          ) : (
            <div className="marketerz-user-pill" style={{ cursor: 'pointer' }} onClick={() => openAuthModal()}>
              <div className="avatar-fallback" style={{ background: 'transparent', border: '1px solid currentColor', color: 'inherit' }}>
                <LogIn size={16} />
              </div>
              <div className="marketerz-user-info">
                <span className="user-name">Sign In</span>
                <span className="user-email">Save and react to stories</span>
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
