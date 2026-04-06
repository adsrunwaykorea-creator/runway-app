/**
 * public/json/pricing-config.json 단일 소스 + lib/pricing.ts 와 동일한 병합/할인 규칙
 */
let cachedConfig = null;

export async function loadPricingConfig() {
    if (cachedConfig) return cachedConfig;
    var res = await fetch("/json/pricing-config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("pricing-config load failed");
    cachedConfig = await res.json();
    return cachedConfig;
}

function omitUndefined(raw) {
    var out = {};
    for (var k in raw) {
        if (Object.prototype.hasOwnProperty.call(raw, k) && raw[k] !== undefined) {
            out[k] = raw[k];
        }
    }
    return out;
}

export function mergePlanConfig(config, serviceKey, period) {
    var base = (config[period] || {});
    var rawOverride =
        (config.byService && config.byService[serviceKey] && config.byService[serviceKey][period]) || {};
    var override = omitUndefined(rawOverride);
    return Object.assign({}, base, override);
}

export function calculateDiscountRate(originalPrice, price) {
    if (originalPrice == null || !price || originalPrice <= price) return null;
    var rate = Math.round(((originalPrice - price) / originalPrice) * 100);
    return rate > 0 ? rate : null;
}

export function calculateSaving(originalPrice, price) {
    if (originalPrice == null || !price || originalPrice <= price) return null;
    return originalPrice - price;
}

export function getPlanMeta(config, serviceKey, period, periodLabels) {
    var merged = mergePlanConfig(config, serviceKey, period);
    var rawSale = merged.price;
    var saleNum = rawSale !== undefined && rawSale !== null ? Number(rawSale) : NaN;
    if (!Number.isFinite(saleNum)) return null;

    var price = saleNum;
    var rawOrig = merged.originalPrice;
    var origNum = rawOrig !== undefined && rawOrig !== null ? Number(rawOrig) : NaN;
    var originalPrice = Number.isFinite(origNum) && origNum > price ? origNum : null;
    var discountRate = calculateDiscountRate(originalPrice, price);
    var saving = calculateSaving(originalPrice, price);
    var label = merged.label || (periodLabels && periodLabels[period]) || period;

    return {
        label: label,
        price: price,
        originalPrice: originalPrice,
        discountRate: discountRate,
        saving: saving
    };
}
