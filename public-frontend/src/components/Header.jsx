'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function Header({ toggleSidebar }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-200"
        onClick={toggleSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center flex-1">
          <Link href="/" className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">
            News<span className="text-rose-600">Portal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
