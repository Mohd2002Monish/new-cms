'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { publicApi } from '@/lib/api';

export default function GoogleTagManager({ initialContainerId = '' }) {
  const [containerId, setContainerId] = useState(
    initialContainerId || process.env.NEXT_PUBLIC_GTM_ID || ''
  );
  const [enabled, setEnabled] = useState(Boolean(initialContainerId || process.env.NEXT_PUBLIC_GTM_ID));

  useEffect(() => {
    let isMounted = true;

    async function loadGtmConfig() {
      try {
        const res = await publicApi.getGtmConfig();
        if (!isMounted) return;
        const config = res?.data;
        if (config?.enabled && config?.enablePublicWebsite !== false && config?.containerId) {
          setContainerId(config.containerId);
          setEnabled(true);

          // Initialize dataLayer
          if (typeof window !== 'undefined') {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              'gtm.start': new Date().getTime(),
              event: 'gtm.js',
            });
          }
        } else if (!process.env.NEXT_PUBLIC_GTM_ID) {
          setEnabled(false);
        }
      } catch (err) {
        // Non-fatal if config endpoint is unreachable
        console.debug('[GTM] Remote config fetch skipped:', err?.message);
      }
    }

    loadGtmConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!enabled || !containerId) return null;

  return (
    <>
      {/* Google Tag Manager Main Script */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${encodeURIComponent(containerId)}');`,
        }}
      />
      {/* Google Tag Manager (noscript fallback) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}

