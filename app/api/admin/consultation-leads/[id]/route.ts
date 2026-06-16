import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { CONSULTATION_LEAD_SELECT } from '@/lib/admin/consultation-leads-query';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { CONSULTATION_LEAD_STATUSES } from '@/types/consultation-lead';

type PatchBody = {
  status?: unknown;
  admin_memo?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch (error) {
    console.error('[admin/consultation-leads/:id] invalid JSON', error);
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    const status = str(body.status);
    if (!CONSULTATION_LEAD_STATUSES.includes(status as (typeof CONSULTATION_LEAD_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: '처리상태 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.status = status;
  }

  if (body.admin_memo !== undefined) {
    updates.admin_memo = str(body.admin_memo);
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, message: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('consultation_leads')
      .update(updates)
      .eq('id', id)
      .select(CONSULTATION_LEAD_SELECT)
      .maybeSingle();

    if (error) {
      console.error('[admin/consultation-leads/:id] update failed', error);
      return NextResponse.json(
        { success: false, message: '상담신청 정보를 저장하지 못했습니다.' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ success: false, message: '상담신청 내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error) {
    console.error('[admin/consultation-leads/:id] PATCH threw', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)',
      },
      { status: 503 },
    );
  }
}
