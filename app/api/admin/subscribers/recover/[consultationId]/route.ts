import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { recoverOrphanSubscriber } from '@/lib/subscriber/register-subscriber';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ consultationId: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { consultationId } = await context.params;
  if (!consultationId) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const result = await recoverOrphanSubscriber(supabase, consultationId);
    return NextResponse.json({
      success: true,
      subscriberId: result.subscriberId,
      message: '가입자 데이터를 subscribers 테이블로 복구했습니다.',
    });
  } catch (error) {
    console.error('[admin/subscribers/recover/:consultationId] failed', { consultationId, error });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '가입자 데이터 복구에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
