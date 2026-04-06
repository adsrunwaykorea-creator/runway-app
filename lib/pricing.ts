import raw from '@/public/json/pricing-config.json';

export type PeriodKey = 'monthly' | 'quarterly';
export type ServiceKey = 'sns' | 'db';

type PlanSlice = {
  label?: string;
  period?: string;
  price?: number;
  originalPrice?: number;
};

type PricingJson = {
  renewalExtraDiscountPercent?: number;
  /** 연장 + 만료 3일 이내(긴급) 시 1개월 상품에 적용하는 할인율 (%) */
  renewalMonthlyUrgentDiscountPercent?: number;
  monthly: PlanSlice;
  quarterly: PlanSlice;
  byService?: Partial<Record<ServiceKey, Partial<Record<PeriodKey, PlanSlice>>>>;
};

const config = raw as PricingJson;

/** 연장 결제 시 캠페인가에 추가로 곱해지는 할인율 (%) */
export const renewalExtraDiscountPercent = Number(config.renewalExtraDiscountPercent ?? 10);

/** 연장 + 긴급(만료 3일 이내) 시 1개월 정가 대비 할인율 (%) */
export const renewalMonthlyUrgentDiscountPercent = Number(config.renewalMonthlyUrgentDiscountPercent ?? 15);

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj)) {
    const key = k as keyof T;
    if (obj[key] !== undefined) {
      (out as Record<string, unknown>)[k] = obj[key];
    }
  }
  return out;
}

/** productPricingConfig 단일 소스( public/json/pricing-config.json ) 병합 결과 */
export function mergePlanConfig(serviceKey: ServiceKey, period: PeriodKey): PlanSlice {
  const base = (config[period] ?? {}) as PlanSlice;
  const rawOverride = config.byService?.[serviceKey]?.[period] ?? {};
  const override = omitUndefined(rawOverride as Record<string, unknown>) as PlanSlice;
  return { ...base, ...override };
}

export function calculateDiscountRate(originalPrice: number | null | undefined, price: number): number | null {
  if (originalPrice == null || !price || originalPrice <= price) return null;
  const rate = Math.round(((originalPrice - price) / originalPrice) * 100);
  return rate > 0 ? rate : null;
}

export function calculateSaving(originalPrice: number | null | undefined, price: number): number | null {
  if (originalPrice == null || !price || originalPrice <= price) return null;
  return originalPrice - price;
}

export type PlanMeta = {
  label: string;
  price: number;
  originalPrice: number | null;
  discountRate: number | null;
  saving: number | null;
};

export function getPlanMeta(serviceKey: ServiceKey, period: PeriodKey, periodLabels: Record<PeriodKey, string>): PlanMeta | null {
  const merged = mergePlanConfig(serviceKey, period);
  const rawSale = merged.price;
  const saleNum = rawSale !== undefined && rawSale !== null ? Number(rawSale) : NaN;
  if (!Number.isFinite(saleNum)) return null;

  const price = saleNum;
  const rawOrig = merged.originalPrice;
  const origNum = rawOrig !== undefined && rawOrig !== null ? Number(rawOrig) : NaN;
  const originalPrice = Number.isFinite(origNum) && origNum > price ? origNum : null;
  const discountRate = calculateDiscountRate(originalPrice, price);
  const saving = calculateSaving(originalPrice, price);
  const label = merged.label ?? periodLabels[period] ?? period;

  return {
    label,
    price,
    originalPrice,
    discountRate,
    saving,
  };
}

/** 마이페이지: orders.service_key + period 로 정가(취소선) 조회 — 없으면 null */
export function getListPriceForOrder(serviceKey: string | null | undefined, period: string | null | undefined): number | null {
  if (period !== 'monthly' && period !== 'quarterly') return null;
  const sk = serviceKey === 'db' || serviceKey === 'sns' ? serviceKey : null;
  if (!sk) return null;
  const merged = mergePlanConfig(sk, period);
  const rawOrig = merged.originalPrice;
  const origNum = rawOrig !== undefined && rawOrig !== null ? Number(rawOrig) : NaN;
  const rawSale = merged.price;
  const saleNum = rawSale !== undefined && rawSale !== null ? Number(rawSale) : NaN;
  if (!Number.isFinite(saleNum)) return null;
  if (!Number.isFinite(origNum) || origNum <= saleNum) return null;
  return origNum;
}
