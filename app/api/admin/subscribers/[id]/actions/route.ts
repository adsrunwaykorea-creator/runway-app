import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import {
  createRenewalRequest,
  endSubscriberService,
} from '@/lib/subscriber/register-subscriber';

type Body = {
  action?: unknown;
  end_reason?: unknown;
  admin_memo?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const action = str(body.action);
  if (!action) {
    return NextResponse.json({ success: false, message: 'action이 필요합니다.' }, { status: 400 });
  }

  try {
    const supabase = (await import('@/lib/supabase/server')).getSupabaseAdminClient();

    if (action === 'renew_request') {
      await createRenewalRequest(supabase, id);
      return NextResponse.json({ success: true, action });
    }

    if (action === 'end_service') {
      const result = await endSubscriberService(supabase, id, {
        endReason: str(body.end_reason) || '서비스 종료',
        adminMemo: str(body.admin_memo) || undefined,
      });
      return NextResponse.json({ success: true, action, endedId: result.endedId });
    }

    return NextResponse.json({ success: false, message: '지원하지 않는 action입니다.' }, { status: 400 });
  } catch (error) {
    console.error('[admin/subscribers/:id/actions] failed', { id, action, error });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '처리에 실패했습니다.' },
      { status: 500 },
    );
  }
}
