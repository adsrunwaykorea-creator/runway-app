import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { CONSULTATION_LEAD_SELECT } from '@/lib/admin/consultation-leads-query';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('consultation_leads')
      .select(CONSULTATION_LEAD_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/consultation-leads] list failed', error);
      return NextResponse.json(
        { success: false, message: '상담신청 내역을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, leads: data ?? [] });
  } catch (error) {
    console.error('[admin/consultation-leads] GET threw', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)',
      },
      { status: 503 },
    );
  }
}
