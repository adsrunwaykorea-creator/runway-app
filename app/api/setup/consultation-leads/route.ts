import { NextResponse } from "next/server";
import { ensureConsultationLeadsTable, getDbConnectionStrings } from "@/lib/db/consultation-leads-setup";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const secret = process.env.SETUP_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  if (getDbConnectionStrings().length === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "DATABASE_URL 또는 SUPABASE_DB_PASSWORD 환경 변수가 필요합니다. Supabase 대시보드 → Settings → Database에서 비밀번호를 확인하세요.",
      },
      { status: 400 },
    );
  }

  const ready = await ensureConsultationLeadsTable();
  if (!ready) {
    return NextResponse.json(
      { success: false, message: "테이블 생성에 실패했습니다. 연결 정보를 확인하세요." },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("consultation_leads").select("id").limit(1);
  if (error) {
    return NextResponse.json(
      { success: false, message: "테이블은 생성됐지만 조회에 실패했습니다.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, message: "consultation_leads 테이블이 준비되었습니다." });
}
