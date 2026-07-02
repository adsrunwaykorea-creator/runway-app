import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { recoverAllOrphanSubscribers } from '@/lib/subscriber/register-subscriber';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    const result = await recoverAllOrphanSubscribers(supabase);

    return NextResponse.json({
      success: true,
      recovered: result.recovered,
      failed: result.failed,
      message:
        result.failed.length > 0
          ? `${result.recovered}명 복구 완료, ${result.failed.length}명 실패`
          : `${result.recovered}명의 가입자 데이터를 복구했습니다.`,
    });
  } catch (error) {
    console.error('[admin/subscribers/recover] failed', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '가입자 데이터 복구에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
