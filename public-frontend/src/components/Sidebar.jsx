'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import SidebarUserProfile from './sidebar/SidebarUserProfile';
import SidebarNavLinks from './sidebar/SidebarNavLinks';

const LOCALES = ['en', 'hi', 'gu'];

/**
 * Sidebar — Main navigation drawer for mobile and compact desktop layouts
 */
export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const segment = pathname?.split('/')[1];
  const lang = LOCALES.includes(segment) ? segment : 'en';
  const [categories, setCategories] = useState([]);

  const { bookmarks, isLoaded } = useBookmarks();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, openAuthModal, logout: readerLogout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      setIsLoggedIn(true);
    }

    async function loadCats() {
      try {
        const response = await publicApi.getCategories({ lang });
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCats();
  }, [lang]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

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
          <Link href={`/${lang}`} className="marketerz-brand" onClick={handleNavClick}>
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
            <Link href={`/${lang}/search`} className="marketerz-icon-btn" onClick={handleNavClick} aria-label="Search">
              <Search size={20} />
            </Link>
            <button className="marketerz-icon-btn mobile-close" onClick={toggleSidebar} aria-label="Close sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

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

        {/* Navigation Links List */}
        <SidebarNavLinks
          categories={categories}
          pathname={pathname}
          lang={lang}
          onNavClick={handleNavClick}
          user={user}
          bookmarks={bookmarks}
          isBookmarksLoaded={isLoaded}
        />

        {/* User Profile Footer */}
        <div className="marketerz-footer">
          <SidebarUserProfile
            user={user}
            isLoggedIn={isLoggedIn}
            lang={lang}
            onNavClick={handleNavClick}
            onOpenAuth={openAuthModal}
            onLogout={readerLogout}
          />
        </div>
      </aside>
    </>
  );
}
