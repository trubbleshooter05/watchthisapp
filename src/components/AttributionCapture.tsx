"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const ATTRIBUTION_KEY = "movieslike_attribution_v1";
const GA_CLIENT_ID_KEY = "movieslike_ga_client_id_v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type AttributionPayload = {
  landing_page: string;
  referrer: string;
  ga_client_id?: string;
} & Partial<Record<(typeof UTM_KEYS)[number], string>>;

function readStoredAttribution(): AttributionPayload | null {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as AttributionPayload) : null;
  } catch {
    return null;
  }
}

function writeStoredAttribution(value: AttributionPayload) {
  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
  } catch {
    // Non-critical; attribution should never block page rendering.
  }
}

function persistGaClientId(value: string) {
  try {
    window.localStorage.setItem(GA_CLIENT_ID_KEY, value);
  } catch {
    // Non-critical; GA may be unavailable or storage may be blocked.
  }
}

function captureGaClientId() {
  if (typeof window.gtag !== "function") return;
  window.gtag("get", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-N3PD01BZW5", "client_id", (clientId: string) => {
    if (clientId) persistGaClientId(clientId);
  });
}

export function getAttributionPayload(): AttributionPayload | null {
  if (typeof window === "undefined") return null;
  const stored = readStoredAttribution();
  const gaClientId = window.localStorage.getItem(GA_CLIENT_ID_KEY) || stored?.ga_client_id;
  if (!stored && !gaClientId) return null;
  return {
    ...(stored ?? {
      landing_page: window.location.href,
      referrer: document.referrer || "",
    }),
    ...(gaClientId ? { ga_client_id: gaClientId } : {}),
  };
}

export function AttributionCapture() {
  useEffect(() => {
    const current = new URL(window.location.href);
    const existing = readStoredAttribution();
    const hasUtm = UTM_KEYS.some((key) => current.searchParams.has(key));

    if (!existing || hasUtm) {
      const next: AttributionPayload = {
        landing_page: existing?.landing_page || current.href,
        referrer: existing?.referrer || document.referrer || "",
      };
      UTM_KEYS.forEach((key) => {
        const value = current.searchParams.get(key) || existing?.[key];
        if (value) next[key] = value;
      });
      writeStoredAttribution(next);
    }

    captureGaClientId();
  }, []);

  return null;
}
