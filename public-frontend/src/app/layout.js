import { Inter, Merriweather } from 'next/font/google';

import Footer from '@/components/Footer';
import './globals.css';

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

export const metadata = {
  title: {
    template: '%s | NewsPortal',
    default: 'NewsPortal — Latest News & Breaking Stories',
  },
  description:
    'Your trusted source for breaking news, in-depth analysis, and real-time updates across politics, sports, technology, and more.',
  manifest: '/manifest.json',
  themeColor: '#e11d48',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NewsPortal',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { type: 'website', siteName: 'NewsPortal' },
  twitter: { card: 'summary_large_image' },
};

import ThemeProvider from '@/components/ThemeProvider';
import ClientLayout from '@/components/ClientLayout';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-black">Skip to main content</a>
        <ThemeProvider>
          <AuthProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
