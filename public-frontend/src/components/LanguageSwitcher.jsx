'use client';

import { usePathname, useRouter } from 'next/navigation';

const LOCALES = ['en', 'hi', 'gu'];
const LABELS = { en: 'EN', hi: 'हिं', gu: 'ગુ' };

/**
 * Pill-style language switcher. Swaps the locale prefix on the current path;
 * the proxy stores the chosen locale in a cookie for future visits.
 */
export default function LanguageSwitcher({ className = '' }) {
  const pathname = usePathname();
  const router = useRouter();

  const segments = (pathname || '/').split('/');
  const current = LOCALES.includes(segments[1]) ? segments[1] : 'en';

  const switchTo = (locale) => {
    if (locale === current) return;
    const rest = LOCALES.includes(segments[1]) ? segments.slice(2) : segments.slice(1);
    // Query string read at click time to avoid a useSearchParams suspense boundary
    const query = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`/${[locale, ...rest].join('/')}${query}`);
  };

  return (
    <div className={`marketerz-toggle-pill ${className}`} role="group" aria-label="Language">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`marketerz-toggle-btn ${current === locale ? 'active' : ''}`}
          onClick={() => switchTo(locale)}
          aria-pressed={current === locale}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
