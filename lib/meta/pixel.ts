import {
  CONSULTATION_FORM_NAME,
  CONSULTATION_LEAD_PARAMS,
  STARTER_VIEW_CONTENT_PARAMS,
  getPackageNameFromPath,
} from "@/lib/meta/constants";
import { captureAttribution, getStoredAttribution } from "@/lib/meta/attribution";
import { getMetaPixelId } from "@/lib/meta/pixel-id";

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

export type CtaLocation = "header" | "hero" | "middle" | "bottom" | "floating" | "unknown";

export type RunwayMetaApi = {
  initializeMetaPixel: typeof initializeMetaPixel;
  trackPageView: typeof trackPageView;
  trackViewContent: typeof trackViewContent;
  trackCustomEvent: typeof trackCustomEvent;
  trackLead: typeof trackLead;
  captureAttribution: typeof captureAttribution;
  getStoredAttribution: typeof getStoredAttribution;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    __runwayMetaPixelInitialized?: string;
    __runwayLeadTracked?: boolean;
    RunwayMeta?: RunwayMetaApi;
  }
}

const CONSULTATION_FORM_IDS = new Set(["contactDetailForm", "contactForm", "growthContactForm"]);
const RECENT_EVENT_WINDOW_MS = 1500;

let lastPageViewKey = "";
const recentEventAt = new Map<string, number>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function wasRecentlyTracked(key: string, windowMs = RECENT_EVENT_WINDOW_MS): boolean {
  const now = Date.now();
  const previous = recentEventAt.get(key) ?? 0;
  if (now - previous < windowMs) return true;
  recentEventAt.set(key, now);
  return false;
}

function currentPagePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function installFbqStub(): FbqFn {
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }
    fbq.queue?.push(args);
  } as FbqFn;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  return fbq;
}

function ensureFbeventsScript(): void {
  const existing = document.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
  if (existing) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.setAttribute("data-runway-meta-pixel", "1");
  document.head.appendChild(script);
}

export function initializeMetaPixel(pixelId = getMetaPixelId()): boolean {
  if (!isBrowser()) return false;
  const id = pixelId.trim();
  if (!id) return false;
  if (window.__runwayMetaPixelInitialized === id) return true;

  if (typeof window.fbq !== "function") {
    const fbq = installFbqStub();
    window.fbq = fbq;
    window._fbq = fbq;
    ensureFbeventsScript();
  }

  window.__runwayMetaPixelInitialized = id;
  window.fbq?.("init", id);
  return true;
}

function canTrack(): boolean {
  if (!isBrowser()) return false;
  const pixelId = getMetaPixelId();
  if (!pixelId) return false;
  return initializeMetaPixel(pixelId);
}

export function trackPageView(pageKey?: string): void {
  if (!canTrack()) return;
  const key = pageKey || currentPagePath();
  if (lastPageViewKey === key) return;
  lastPageViewKey = key;
  window.fbq?.("track", "PageView");
}

export function trackViewContent(params?: Record<string, unknown>): void {
  if (!canTrack()) return;
  const payload = params ?? {
    content_name: STARTER_VIEW_CONTENT_PARAMS.content_name,
    content_category: STARTER_VIEW_CONTENT_PARAMS.content_category,
    content_ids: [...STARTER_VIEW_CONTENT_PARAMS.content_ids],
    content_type: STARTER_VIEW_CONTENT_PARAMS.content_type,
    value: STARTER_VIEW_CONTENT_PARAMS.value,
    currency: STARTER_VIEW_CONTENT_PARAMS.currency,
  };
  const key = `ViewContent:${String(payload.content_ids ?? payload.content_name ?? "default")}`;
  if (wasRecentlyTracked(key)) return;
  window.fbq?.("track", "ViewContent", payload);
}

export function trackCustomEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!canTrack()) return;
  window.fbq?.("trackCustom", eventName, params ?? {});
}

export function trackLead(params: Record<string, unknown> = CONSULTATION_LEAD_PARAMS): void {
  if (!canTrack()) return;
  if (window.__runwayLeadTracked) return;
  if (wasRecentlyTracked("Lead", 4000)) return;
  window.__runwayLeadTracked = true;
  window.fbq?.("track", "Lead", params);
}

export function trackConsultationCtaClick(location: CtaLocation): void {
  if (!canTrack()) return;
  const pagePath = currentPagePath();
  const key = `ConsultationCTA_Click:${location}:${pagePath}`;
  if (wasRecentlyTracked(key, 800)) return;
  trackCustomEvent("ConsultationCTA_Click", {
    page_path: pagePath,
    page_title: document.title || "",
    package_name: getPackageNameFromPath(window.location.pathname),
    button_location: location,
  });
}

export function trackConsultationFormStart(): void {
  if (!canTrack()) return;
  trackCustomEvent("ConsultationFormStart", {
    page_path: currentPagePath(),
    package_name: getPackageNameFromPath(window.location.pathname),
    form_name: CONSULTATION_FORM_NAME,
  });
}

function resolveCtaLocation(element: HTMLElement): CtaLocation {
  const explicit =
    element.dataset.ctaLocation ||
    element.closest("[data-cta-location]")?.getAttribute("data-cta-location");
  if (
    explicit === "header" ||
    explicit === "hero" ||
    explicit === "middle" ||
    explicit === "bottom" ||
    explicit === "floating" ||
    explicit === "unknown"
  ) {
    return explicit;
  }

  if (element.closest(".hero-sticky-cta") || element.classList.contains("hero-sticky-cta")) {
    return "floating";
  }
  if (element.closest("header, .nav, .site-header")) return "header";
  if (element.closest(".hero, .hero-ctas, .hero-cta, .hero-growth")) return "hero";
  if (element.closest(".final-cta, .final-cta-section, .growth-close, .bp-footer")) return "bottom";
  if (element.closest("main, .schematic, .empathy, .growth-transition")) return "middle";
  return "unknown";
}

function isConsultationCta(element: Element): HTMLElement | null {
  const target = element.closest("a[href*='#contact'], [data-cta-location]");
  if (!(target instanceof HTMLElement)) return null;
  if (target.closest(".consult-success, .js-consult-success-top")) return null;
  if (target.closest("form") && target.matches("button, input[type='submit']")) return null;
  const href = target.getAttribute("href") || "";
  if (target.dataset.ctaLocation) return target;
  if (href.includes("#contact")) return target;
  return null;
}

function consultationFormFromEvent(target: EventTarget | null): HTMLFormElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const form = target.closest("form");
  if (!(form instanceof HTMLFormElement) || !CONSULTATION_FORM_IDS.has(form.id)) return null;
  if (
    !(
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    )
  ) {
    return null;
  }
  if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "hidden")) {
    return null;
  }
  return form;
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const cta = isConsultationCta(target);
  if (!cta) return;
  trackConsultationCtaClick(resolveCtaLocation(cta));
}

function onFormStart(event: Event): void {
  const form = consultationFormFromEvent(event.target);
  if (!form) return;
  if (form.dataset.metaFormStart === "1") return;
  form.dataset.metaFormStart = "1";
  trackConsultationFormStart();
}

export function bindConsultationTracking(): () => void {
  if (!isBrowser()) return () => undefined;
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("input", onFormStart, true);
  document.addEventListener("change", onFormStart, true);
  return () => {
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("input", onFormStart, true);
    document.removeEventListener("change", onFormStart, true);
  };
}

export function exposeRunwayMeta(): void {
  if (!isBrowser()) return;
  window.RunwayMeta = {
    initializeMetaPixel,
    trackPageView,
    trackViewContent,
    trackCustomEvent,
    trackLead,
    captureAttribution,
    getStoredAttribution,
  };
}

export { captureAttribution, getStoredAttribution };
