import { NextResponse } from 'next/server';

const LOCALES = ['en', 'hi', 'gu'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'NEXT_LOCALE';

function detectLocale(request) {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (LOCALES.includes(cookie)) return cookie;

  const accept = request.headers.get('accept-language') || '';
  for (const lang of accept.split(',').map((part) => part.split(';')[0].trim().toLowerCase())) {
    const base = lang.split('-')[0];
    if (LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const pathnameLocale = LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameLocale) {
    // Remember the visited language so unprefixed links keep the user's locale
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, pathnameLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // No locale prefix — redirect to the preferred locale, preserving the path
  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export default proxy;

export const config = {
  // Skip Next internals, API routes, and any file-like path (sitemap.xml,
  // manifest.json, favicon.ico, images, …)
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
