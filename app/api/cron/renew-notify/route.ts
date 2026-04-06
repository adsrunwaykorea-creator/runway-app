import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { process1Day, process3Day, process7Day } from '@/lib/renew-notify/process-notify';

function authorizeCron(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return false;
  }
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${expected}`) {
    return true;
  }
  const url = new URL(request.url);
  if (url.searchParams.get('secret') === expected) {
    return true;
  }
  return false;
}

/**
 * 만료 예정 알림 크론 — orders(만료·notify 플래그) + profiles(name, phone).
 * SOLAPI 알림톡 발송(`sendAlimtalk`) 성공 건만 해당 notify_* 컬럼을 true로 갱신.
 * 알림톡 템플릿 ID는 `lib/kakao/templateCodes.ts`의 `KAKAO_TEMPLATE_CODES`에서 관리.
 *
 * 인증: CRON_SECRET이 설정된 경우에만 Bearer 또는 ?secret= 검증.
 * 로컬 테스트 시 CRON_SECRET을 비우면 검증 생략.
 */
export async function POST(request: Request) {
  if (process.env.CRON_SECRET && !authorizeCron(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const d7_count = await process7Day(supabase);
    const d3_count = await process3Day(supabase);
    const d1_count = await process1Day(supabase);

    console.log('[renew-notify] done', { d7_count, d3_count, d1_count });

    return NextResponse.json({
      ok: true,
      d7_count,
      d3_count,
      d1_count,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[renew-notify] error', message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
