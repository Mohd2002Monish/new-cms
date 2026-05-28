'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Menu, X, Settings } from 'lucide-react';
import { publicApi } from '@/lib/api';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 border-r
        bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800
        shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-md shadow-rose-600/20 group-hover:bg-rose-700 transition-colors">
              <span className="text-white font-black text-lg leading-none tracking-tighter">N</span>
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              News<span className="text-rose-600">Portal</span>
            </span>
          </Link>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
            onClick={toggleSidebar}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
          
          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Menu
            </h3>
            <nav className="space-y-1">
              <Link 
                href="/" 
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === '/' 
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                }`}
              >
                <Home size={18} strokeWidth={pathname === '/' ? 2.5 : 2} className={pathname === '/' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                <span>Home</span>
              </Link>
              <a 
                href="/user"
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 transition-all duration-200"
              >
                <Settings size={18} strokeWidth={2} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:rotate-45 transition-all duration-300" />
                <span>User Panel</span>
              </a>
            </nav>
          </div>

          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size={14} strokeWidth={2} />
              Categories
            </h3>
            <nav className="space-y-1">
              {categories.map((cat) => {
                const isActive = pathname === `/category/${cat.slug}`;
                return (
                  <Link
                    key={cat._id}
                    href={`/category/${cat.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
              NewsPortal
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
