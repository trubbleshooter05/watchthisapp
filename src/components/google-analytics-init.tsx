import Script from "next/script";

// Fallback ensures tag loads even if env var isn't available at build time (Vercel)
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-N3PD01BZW5";

/**
 * Server component: injects GA4 scripts with afterInteractive.
 * beforeInteractive can fail to load GA in some browsers (Chrome incognito, etc.).
 * afterInteractive loads after hydration and is more reliable.
 */
export function GoogleAnalyticsInit() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
