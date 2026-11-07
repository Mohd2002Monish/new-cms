import api from '../services/api.js';

let gtmInitialized = false;

/**
 * Initializes Google Tag Manager in the Admin CMS if enabled in settings
 */
export async function initAdminGtm() {
  if (typeof window === 'undefined' || gtmInitialized) return;
  try {
    const { data } = await api.get('/public/gtm/config');
    const { enabled, containerId, enableAdminPanel } = data?.data || {};

    if (!enabled || !enableAdminPanel || !containerId) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Inject GTM head script
    if (!document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
      document.head.appendChild(script);

      // Inject noscript fallback
      const noscript = document.createElement('noscript');
      noscript.id = 'gtm-noscript';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);
    }

    gtmInitialized = true;
  } catch (err) {
    // Silent fail if network or endpoint offline
    console.debug('[GTM] Admin initialization skipped:', err?.message);
  }
}

