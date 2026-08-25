export const STARTER_PACKAGE_NAME = "초보 창업 패키지";
export const GROWTH_PACKAGE_NAME = "사업 성장 패키지";
export const CONSULTATION_FORM_NAME = "무료 상담 신청";

export const STARTER_PACKAGE_VALUE = 660000;
export const STARTER_PACKAGE_CURRENCY = "KRW";

export const STARTER_VIEW_CONTENT_PARAMS = {
  content_name: STARTER_PACKAGE_NAME,
  content_category: "창업 마케팅 패키지",
  content_ids: ["starter-package"],
  content_type: "product",
  value: STARTER_PACKAGE_VALUE,
  currency: STARTER_PACKAGE_CURRENCY,
} as const;

export const CONSULTATION_LEAD_PARAMS = {
  content_name: CONSULTATION_FORM_NAME,
  content_category: STARTER_PACKAGE_NAME,
  currency: STARTER_PACKAGE_CURRENCY,
  value: STARTER_PACKAGE_VALUE,
} as const;

export const ATTRIBUTION_STORAGE_KEY = "runway_meta_attribution_v1";

export function getPackageNameFromPath(pathname: string): string {
  if (pathname.includes("/package/growth")) return GROWTH_PACKAGE_NAME;
  if (pathname.includes("/package/starter")) return STARTER_PACKAGE_NAME;
  return "";
}
