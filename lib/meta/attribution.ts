import { ATTRIBUTION_STORAGE_KEY } from "@/lib/meta/constants";
import {
  emptyStoredAttribution,
  type AttributionTouch,
  type StoredAttribution,
} from "@/lib/meta/attribution-fields";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emptyTouch(): AttributionTouch {
  return emptyStoredAttribution().first;
}

function hasAdParams(touch: AttributionTouch): boolean {
  return Boolean(
    touch.utm_source ||
      touch.utm_medium ||
      touch.utm_campaign ||
      touch.utm_content ||
      touch.utm_term ||
      touch.fbclid,
  );
}

function isUnsetTouch(touch: AttributionTouch): boolean {
  return !touch.visited_at && !touch.landing_page && !hasAdParams(touch) && !touch.referrer;
}

function readQueryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value : null;
}

function sanitizeReferrer(referrer: string): string | null {
  const value = referrer.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin === window.location.origin) return null;
    return value;
  } catch {
    return value;
  }
}

function currentLandingPage(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function readTouchFromLocation(): AttributionTouch {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: readQueryValue(params, "utm_source"),
    utm_medium: readQueryValue(params, "utm_medium"),
    utm_campaign: readQueryValue(params, "utm_campaign"),
    utm_content: readQueryValue(params, "utm_content"),
    utm_term: readQueryValue(params, "utm_term"),
    fbclid: readQueryValue(params, "fbclid"),
    landing_page: currentLandingPage(),
    referrer: sanitizeReferrer(document.referrer || ""),
    visited_at: new Date().toISOString(),
  };
}

function mergeNonEmpty(previous: AttributionTouch, next: AttributionTouch): AttributionTouch {
  return {
    utm_source: next.utm_source || previous.utm_source,
    utm_medium: next.utm_medium || previous.utm_medium,
    utm_campaign: next.utm_campaign || previous.utm_campaign,
    utm_content: next.utm_content || previous.utm_content,
    utm_term: next.utm_term || previous.utm_term,
    fbclid: next.fbclid || previous.fbclid,
    landing_page: next.landing_page || previous.landing_page,
    referrer: next.referrer || previous.referrer,
    visited_at: next.visited_at || previous.visited_at,
  };
}

function readStorage(): StoredAttribution | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      first: { ...emptyTouch(), ...(parsed.first ?? {}) },
      last: { ...emptyTouch(), ...(parsed.last ?? {}) },
    };
  } catch {
    return null;
  }
}

function writeStorage(stored: StoredAttribution): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private mode / blocked storage should not break the page.
  }
}

export function getStoredAttribution(): StoredAttribution {
  return readStorage() ?? emptyStoredAttribution();
}

export function captureAttribution(): StoredAttribution {
  if (!isBrowser()) return emptyStoredAttribution();

  const current = readTouchFromLocation();
  const stored = readStorage() ?? emptyStoredAttribution();

  if (isUnsetTouch(stored.first)) {
    stored.first = current;
    stored.last = hasAdParams(current) ? current : stored.last.visited_at ? stored.last : current;
  } else if (hasAdParams(current)) {
    stored.last = mergeNonEmpty(stored.last, current);
  }

  writeStorage(stored);
  return stored;
}
