"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Must match GoogleAnalyticsInit fallback
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-N3PD01BZW5";

/**
 * Client component: tracks SPA route changes. Scripts are in GoogleAnalyticsInit (layout).
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const query = window.location.search.replace(/^\?/, "");
    const pagePath = query ? `${pathname}?${query}` : pathname;
    window.gtag("config", GA_MEASUREMENT_ID, { page_path: pagePath });
  }, [pathname]);

  return null;
}
