import { NextResponse } from "next/server";
import { getSupabaseLeadClient } from "@/lib/supabase/server";

type Body = {
  source?: unknown;
  sessionKey?: unknown;
  businessType?: unknown;
  region?: unknown;
  monthlyBudget?: unknown;
  adBudget?: unknown;
  goal?: unknown;
  message?: unknown;
  contact?: unknown;
  name?: unknown;
  company?: unknown;
  companyName?: unknown;
  phone?: unknown;
  serviceType?: unknown;
  privacyConsent?: unknown;
  createdAt?: unknown;
  payload?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function payloadRecord(body: Body): Record<string, unknown> | null {
  if (body.payload && typeof body.payload === "object" && body.payload !== null) {
    return body.payload as Record<string, unknown>;
  }
  return null;
}

export async function POST(request: Request) {
  console.log("[consultation-lead] POST received");

  let body: Body;
  try {
    body = (await request.json()) as Body;
    console.log("[consultation-lead] request body keys", Object.keys(body));
  } catch (error) {
    console.error("[consultation-lead] invalid JSON body", error);
    return NextResponse.json(
      { success: false, message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const source = str(body.source);
  if (source !== "contact_us" && source !== "chatbot") {
    console.error("[consultation-lead] invalid source", source);
    return NextResponse.json(
      { success: false, message: "source 값이 올바르지 않습니다. (contact_us | chatbot)" },
      { status: 400 },
    );
  }

  const extra = payloadRecord(body);
  const name = str(body.name) || str(body.companyName);
  const company = str(body.company) || str(body.companyName);
  const phone = str(body.phone);
  const serviceType = str(body.serviceType);
  const message = str(body.message) || str(extra?.message);
  const adBudget = str(body.adBudget) || str(body.monthlyBudget) || str(extra?.adBudget);

  const privacyConsent =
    body.privacyConsent === true || extra?.privacyConsent === true;

  if (source === "contact_us" && !privacyConsent) {
    console.error("[consultation-lead] privacy consent missing for contact_us");
    return NextResponse.json(
      { success: false, message: "개인정보 수집 및 이용에 동의해 주세요." },
      { status: 400 },
    );
  }

  const sessionKey = str(body.sessionKey) || `${source}-${crypto.randomUUID()}`;
  const businessType = str(body.businessType) || serviceType || "일반 상담";
  const region = str(body.region) || businessType || "미입력";
  const monthlyBudget = adBudget || str(body.monthlyBudget) || "미입력";
  const goal = str(body.goal) || message || "상담 문의";
  const contact = str(body.contact) || [name, phone].filter(Boolean).join(" / ");
  const createdAt = str(body.createdAt) || new Date().toISOString();
  const pageSource = str(extra?.source) || "runwayads.kr";

  if (!businessType || !region || !monthlyBudget || !goal || !contact) {
    console.error("[consultation-lead] missing required fields", {
      businessType: !!businessType,
      region: !!region,
      monthlyBudget: !!monthlyBudget,
      goal: !!goal,
      contact: !!contact,
    });
    return NextResponse.json(
      { success: false, message: "필수 항목을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  const rawPayload = {
    ...(extra ?? {}),
    source: pageSource,
    privacyConsent,
    createdAt,
    name: name || null,
    companyName: company || null,
    phone: phone || null,
    businessType,
    adBudget: monthlyBudget,
    message: message || null,
    serviceType: serviceType || null,
  };

  try {
    const supabase = getSupabaseLeadClient();
    const row = {
      source,
      session_key: sessionKey,
      business_type: businessType,
      region,
      monthly_budget: monthlyBudget,
      goal,
      contact,
      lead_name: name || null,
      company: company || null,
      phone: phone || null,
      service_type: serviceType || null,
      raw_payload: rawPayload,
    };

    console.log("[consultation-lead] inserting row", {
      source: row.source,
      session_key: row.session_key,
      business_type: row.business_type,
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
      return NextResponse.json(
        { success: false, message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 },
      );
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[consultation-lead] getSupabaseLeadClient or insert threw", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      {
        success: false,
        message:
          "서버 설정을 확인해 주세요. (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)",
      },
      { status: 503 },
    );
  }

  console.log("[consultation-lead] insert success", { sessionKey });

  return NextResponse.json({
    success: true,
    message: "상담 신청이 접수되었습니다. 확인 후 빠르게 연락드리겠습니다.",
  });
}
