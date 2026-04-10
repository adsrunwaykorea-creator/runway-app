import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Body = {
  source?: unknown;
  sessionKey?: unknown;
  businessType?: unknown;
  region?: unknown;
  monthlyBudget?: unknown;
  goal?: unknown;
  contact?: unknown;
  name?: unknown;
  company?: unknown;
  phone?: unknown;
  serviceType?: unknown;
  payload?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const source = str(body.source);
  if (source !== "contact_us" && source !== "chatbot") {
    return NextResponse.json(
      { success: false, message: "source 값이 올바르지 않습니다. (contact_us | chatbot)" },
      { status: 400 },
    );
  }

  const name = str(body.name);
  const company = str(body.company);
  const phone = str(body.phone);
  const serviceType = str(body.serviceType);

  const sessionKey = str(body.sessionKey) || `${source}-${crypto.randomUUID()}`;
  const businessType = str(body.businessType) || serviceType || "일반 상담";
  const region = str(body.region) || "미입력";
  const monthlyBudget = str(body.monthlyBudget) || "미입력";
  const goal = str(body.goal) || "상담 문의";
  const contact = str(body.contact) || [name, phone].filter(Boolean).join(" / ");

  if (!businessType || !region || !monthlyBudget || !goal || !contact) {
    return NextResponse.json(
      { success: false, message: "필수 항목을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
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
      raw_payload:
        body.payload && typeof body.payload === "object" && body.payload !== null
          ? body.payload
          : null,
    };

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
    console.error("[consultation-lead] getSupabaseAdminClient or insert threw", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      {
        success: false,
        message:
          "서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL)",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "상담 요청이 접수되었습니다.",
  });
}
