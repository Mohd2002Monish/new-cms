import { Inter, Merriweather, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';
import { LOCALES, hasLocale } from '@/i18n/dictionaries';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700'],
  display: 'swap',
});

// Indic scripts: Hindi (Devanagari) and Gujarati coverage
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  variable: '--font-gujarati',
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const viewport = {
  themeColor: '#dc2626',
};

export const metadata = {
  title: {
    template: '%s | NewsPortal',
    default: 'NewsPortal — Latest News & Breaking Stories',
  },
  description:
    'Your trusted source for breaking news, in-depth analysis, and real-time updates across politics, sports, technology, and more.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NewsPortal',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { type: 'website', siteName: 'NewsPortal' },
  twitter: { card: 'summary_large_image' },
};

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

import ThemeProvider from '@/components/ThemeProvider';
import ClientLayout from '@/components/ClientLayout';
import { AuthProvider } from '@/context/AuthContext';
import GoogleTagManager from '@/components/GoogleTagManager';

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${merriweather.variable} ${notoDevanagari.variable} ${notoGujarati.variable}`}
    >
      <body className="antialiased" data-lang={lang} suppressHydrationWarning>
        <GoogleTagManager />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-black">Skip to main content</a>
        <ThemeProvider>
          <AuthProvider>
            <ClientLayout lang={lang}>
              {children}
            </ClientLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
