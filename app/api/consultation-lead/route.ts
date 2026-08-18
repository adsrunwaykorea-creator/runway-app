import { NextResponse } from "next/server";
import { isMissingTableError } from "@/lib/consultation-leads-errors";
import { getSupabaseLeadClient } from "@/lib/supabase/server";

const SAVE_ERROR_MESSAGE = "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
const SUCCESS_MESSAGE = "상담 신청이 완료되었습니다. 빠르게 연락드리겠습니다.";

type Body = {
  source?: unknown;
  sessionKey?: unknown;
  businessType?: unknown;
  business_type?: unknown;
  industry?: unknown;
  region?: unknown;
  business_region?: unknown;
  businessRegion?: unknown;
  monthlyBudget?: unknown;
  adBudget?: unknown;
  goal?: unknown;
  current_status?: unknown;
  currentStatus?: unknown;
  message?: unknown;
  adChannel?: unknown;
  contact?: unknown;
  name?: unknown;
  company?: unknown;
  companyName?: unknown;
  company_name?: unknown;
  phone?: unknown;
  serviceType?: unknown;
  service_type?: unknown;
  packageType?: unknown;
  package_type?: unknown;
  privacyConsent?: unknown;
  privacyAgreed?: unknown;
  privacy_agreed?: unknown;
  pageSource?: unknown;
  page_source?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  payload?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    const next = str(value);
    if (next) return next;
  }
  return "";
}

function payloadRecord(body: Body): Record<string, unknown> | null {
  if (body.payload && typeof body.payload === "object" && body.payload !== null) {
    return body.payload as Record<string, unknown>;
  }
  return null;
}

function normalizeServiceType(value: string): string | null {
  const lowered = value.toLowerCase();
  if (lowered === "starter" || lowered.includes("/package/starter")) return "starter";
  if (lowered === "growth" || lowered.includes("/package/growth")) return "growth";
  return value || null;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export async function POST(request: Request) {
  console.log("[consultation-lead] POST received");

  let body: Body;
  try {
    body = (await request.json()) as Body;
    console.log("[consultation-lead] request body keys", Object.keys(body));
  } catch (error) {
    console.error("[consultation-lead] invalid JSON body", error);
    return NextResponse.json({ success: false, message: SAVE_ERROR_MESSAGE }, { status: 400 });
  }

  const extra = payloadRecord(body);
  const source = pickStr(body.source, extra?.source) || "contact_us";
  if (source !== "contact_us" && source !== "chatbot") {
    console.error("[consultation-lead] invalid source", source);
    return NextResponse.json({ success: false, message: SAVE_ERROR_MESSAGE }, { status: 400 });
  }

  const name = pickStr(body.name, extra?.name);
  const company = pickStr(
    body.company,
    body.companyName,
    body.company_name,
    extra?.company,
    extra?.companyName,
    extra?.company_name,
    extra?.business_name,
  );
  const phone = pickStr(body.phone, extra?.phone);
  const businessType = pickStr(
    body.businessType,
    body.business_type,
    body.industry,
    extra?.businessType,
    extra?.business_type,
    extra?.industry,
  );
  const region = pickStr(
    body.region,
    body.business_region,
    body.businessRegion,
    extra?.region,
    extra?.business_region,
    extra?.businessRegion,
  );
  const currentStatus = pickStr(
    body.current_status,
    body.currentStatus,
    extra?.current_status,
    extra?.currentStatus,
    extra?.marketing_status,
    body.goal,
    extra?.goal,
    extra?.message,
    body.message,
  );
  const serviceType = normalizeServiceType(
    pickStr(
      body.packageType,
      body.package_type,
      body.serviceType,
      body.service_type,
      extra?.package_type,
      extra?.packageType,
      extra?.service_type,
      extra?.serviceType,
    ),
  );
  const privacyAgreed =
    isTruthy(body.privacyAgreed) ||
    isTruthy(body.privacy_agreed) ||
    isTruthy(body.privacyConsent) ||
    isTruthy(extra?.privacyAgreed) ||
    isTruthy(extra?.privacy_agreed) ||
    isTruthy(extra?.privacyConsent);

  if (source === "contact_us" && !privacyAgreed) {
    console.error("[consultation-lead] privacy consent missing for contact_us");
    return NextResponse.json(
      { success: false, message: "개인정보 수집 및 이용에 동의해 주세요." },
      { status: 400 },
    );
  }

  if (source === "contact_us" && (!name || !phone || !company || !businessType)) {
    console.error("[consultation-lead] missing required contact fields", {
      name: !!name,
      phone: !!phone,
      company: !!company,
      businessType: !!businessType,
    });
    return NextResponse.json(
      { success: false, message: "회사명 또는 매장명을 입력해 주세요." },
      { status: 400 },
    );
  }

  const sessionKey = pickStr(body.sessionKey, extra?.sessionKey) || `${source}-${crypto.randomUUID()}`;
  const contact = pickStr(body.contact, extra?.contact) || [name, phone].filter(Boolean).join(" / ");
  const pageSource = pickStr(
    body.pageSource,
    body.page_source,
    extra?.pageSource,
    extra?.page_source,
  );
  const referrer = pickStr(body.referrer, extra?.referrer) || null;
  const utmSource = pickStr(body.utmSource, extra?.utm_source, extra?.utmSource) || null;
  const utmMedium = pickStr(body.utmMedium, extra?.utm_medium, extra?.utmMedium) || null;
  const utmCampaign = pickStr(body.utmCampaign, extra?.utm_campaign, extra?.utmCampaign) || null;
  const monthlyBudget = pickStr(body.monthlyBudget, body.adBudget, extra?.monthlyBudget, extra?.adBudget);
  const adChannel = pickStr(body.adChannel, extra?.adChannel) || null;
  const message = pickStr(body.message, extra?.message) || null;
  const goal = currentStatus || "상담 문의";

  if (!contact) {
    return NextResponse.json({ success: false, message: SAVE_ERROR_MESSAGE }, { status: 400 });
  }

  const rawPayload = {
    ...(extra ?? {}),
    name: name || null,
    phone: phone || null,
    company: company || null,
    industry: businessType || null,
    region: region || null,
    current_status: currentStatus || null,
    package_type: serviceType,
    source: "contact_us",
    page_source: pageSource || null,
    privacy_agreed: privacyAgreed,
    referrer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  };

  const row: Record<string, unknown> = {
    source,
    session_key: sessionKey,
    lead_name: name || null,
    company: company || null,
    phone: phone || null,
    business_type: businessType || "일반 상담",
    region: region || "미입력",
    goal,
    service_type: serviceType,
    privacy_agreed: privacyAgreed,
    page_source: pageSource || null,
    raw_payload: rawPayload,
    contact,
  };

  if (referrer) row.referrer = referrer;
  if (utmSource) row.utm_source = utmSource;
  if (utmMedium) row.utm_medium = utmMedium;
  if (utmCampaign) row.utm_campaign = utmCampaign;
  row.monthly_budget = monthlyBudget || "미입력";
  if (message) row.message = message;
  if (adChannel) row.ad_channel = adChannel;

  try {
    const supabase = getSupabaseLeadClient();
    console.log("[consultation-lead] inserting row", {
      source: row.source,
      service_type: row.service_type,
      keys: Object.keys(row),
    });

    const { error } = await supabase.from("consultation_leads").insert(row);

    if (error) {
      console.error("[consultation-lead] insert consultation_leads failed", {
        table: "consultation_leads",
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const message = isMissingTableError(error.code)
        ? "상담 신청 DB가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요."
        : SAVE_ERROR_MESSAGE;
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[consultation-lead] getSupabaseLeadClient or insert threw", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json({ success: false, message: SAVE_ERROR_MESSAGE }, { status: 503 });
  }

  console.log("[consultation-lead] insert success", { sessionKey, serviceType });

  return NextResponse.json({
    success: true,
    message: SUCCESS_MESSAGE,
  });
}
