export type AttributionTouch = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  landing_page: string | null;
  referrer: string | null;
  visited_at: string | null;
};

export type StoredAttribution = {
  first: AttributionTouch;
  last: AttributionTouch;
};

export type AttributionLeadFields = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  landing_page: string | null;
  referrer: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_utm_term: string | null;
  first_fbclid: string | null;
  first_landing_page: string | null;
  first_referrer: string | null;
  first_visited_at: string | null;
  last_utm_source: string | null;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  last_utm_content: string | null;
  last_utm_term: string | null;
  last_fbclid: string | null;
  last_landing_page: string | null;
  last_referrer: string | null;
  last_visited_at: string | null;
};

export const ATTRIBUTION_DB_COLUMNS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "landing_page",
  "referrer",
  "first_utm_source",
  "first_utm_medium",
  "first_utm_campaign",
  "first_utm_content",
  "first_utm_term",
  "first_fbclid",
  "first_landing_page",
  "first_referrer",
  "first_visited_at",
  "last_utm_source",
  "last_utm_medium",
  "last_utm_campaign",
  "last_utm_content",
  "last_utm_term",
  "last_fbclid",
  "last_landing_page",
  "last_referrer",
  "last_visited_at",
] as const;

export const ATTRIBUTION_MIGRATION_PROBE_COLUMN = "first_utm_source" as const;

const TOUCH_KEYS: (keyof AttributionTouch)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "landing_page",
  "referrer",
  "visited_at",
];

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function emptyAttributionTouch(): AttributionTouch {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    fbclid: null,
    landing_page: null,
    referrer: null,
    visited_at: null,
  };
}

export function emptyStoredAttribution(): StoredAttribution {
  return {
    first: emptyAttributionTouch(),
    last: emptyAttributionTouch(),
  };
}

function parseTouch(value: unknown): AttributionTouch {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const touch = emptyAttributionTouch();
  for (const key of TOUCH_KEYS) {
    touch[key] = asTrimmedString(source[key]);
  }
  return touch;
}

export function parseStoredAttribution(value: unknown): StoredAttribution | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!("first" in record) && !("last" in record)) return null;
  return {
    first: parseTouch(record.first),
    last: parseTouch(record.last),
  };
}

export function storedAttributionToLeadFields(
  stored: StoredAttribution,
): AttributionLeadFields {
  const first = stored.first;
  const last = stored.last;
  const pick = (key: keyof AttributionTouch) => last[key] || first[key] || null;

  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
    fbclid: pick("fbclid"),
    landing_page: first.landing_page || last.landing_page || null,
    referrer: last.referrer || first.referrer || null,
    first_utm_source: first.utm_source,
    first_utm_medium: first.utm_medium,
    first_utm_campaign: first.utm_campaign,
    first_utm_content: first.utm_content,
    first_utm_term: first.utm_term,
    first_fbclid: first.fbclid,
    first_landing_page: first.landing_page,
    first_referrer: first.referrer,
    first_visited_at: first.visited_at,
    last_utm_source: last.utm_source,
    last_utm_medium: last.utm_medium,
    last_utm_campaign: last.utm_campaign,
    last_utm_content: last.utm_content,
    last_utm_term: last.utm_term,
    last_fbclid: last.fbclid,
    last_landing_page: last.landing_page,
    last_referrer: last.referrer,
    last_visited_at: last.visited_at,
  };
}

function overlayNonEmpty(
  base: AttributionLeadFields,
  overlay: Partial<AttributionLeadFields>,
): AttributionLeadFields {
  const next = { ...base };
  for (const key of ATTRIBUTION_DB_COLUMNS) {
    const value = overlay[key];
    if (value) next[key] = value;
  }
  return next;
}

function pickFlatAttribution(
  sources: Array<Record<string, unknown> | null | undefined>,
): Partial<AttributionLeadFields> {
  const read = (...keys: string[]) => {
    for (const source of sources) {
      if (!source) continue;
      for (const key of keys) {
        const value = asTrimmedString(source[key]);
        if (value) return value;
      }
    }
    return null;
  };

  return {
    utm_source: read("utm_source", "utmSource"),
    utm_medium: read("utm_medium", "utmMedium"),
    utm_campaign: read("utm_campaign", "utmCampaign"),
    utm_content: read("utm_content", "utmContent"),
    utm_term: read("utm_term", "utmTerm"),
    fbclid: read("fbclid"),
    landing_page: read("landing_page", "landingPage"),
    referrer: read("referrer"),
    first_utm_source: read("first_utm_source", "firstUtmSource"),
    first_utm_medium: read("first_utm_medium", "firstUtmMedium"),
    first_utm_campaign: read("first_utm_campaign", "firstUtmCampaign"),
    first_utm_content: read("first_utm_content", "firstUtmContent"),
    first_utm_term: read("first_utm_term", "firstUtmTerm"),
    first_fbclid: read("first_fbclid", "firstFbclid"),
    first_landing_page: read("first_landing_page", "firstLandingPage"),
    first_referrer: read("first_referrer", "firstReferrer"),
    first_visited_at: read("first_visited_at", "firstVisitedAt"),
    last_utm_source: read("last_utm_source", "lastUtmSource"),
    last_utm_medium: read("last_utm_medium", "lastUtmMedium"),
    last_utm_campaign: read("last_utm_campaign", "lastUtmCampaign"),
    last_utm_content: read("last_utm_content", "lastUtmContent"),
    last_utm_term: read("last_utm_term", "lastUtmTerm"),
    last_fbclid: read("last_fbclid", "lastFbclid"),
    last_landing_page: read("last_landing_page", "lastLandingPage"),
    last_referrer: read("last_referrer", "lastReferrer"),
    last_visited_at: read("last_visited_at", "lastVisitedAt"),
  };
}

export function pickAttributionLeadFields(input: {
  body: Record<string, unknown>;
  extra?: Record<string, unknown> | null;
}): AttributionLeadFields {
  const stored =
    parseStoredAttribution(input.body.attribution) ??
    parseStoredAttribution(input.extra?.attribution);
  const flat = pickFlatAttribution([input.body, input.extra]);
  const base = stored
    ? storedAttributionToLeadFields(stored)
    : storedAttributionToLeadFields(emptyStoredAttribution());
  return overlayNonEmpty(base, flat);
}

export function compactAttributionFields(
  fields: AttributionLeadFields,
): Record<string, string> {
  const compact: Record<string, string> = {};
  for (const key of ATTRIBUTION_DB_COLUMNS) {
    const value = fields[key];
    if (value) compact[key] = value;
  }
  return compact;
}
