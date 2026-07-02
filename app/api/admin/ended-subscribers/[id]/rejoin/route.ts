import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { rejoinEndedSubscriber } from '@/lib/subscriber/register-subscriber';

type Body = {
  product_name?: unknown;
  payment_method?: unknown;
  payment_amount?: unknown;
  paid_at?: unknown;
  service_start_date?: unknown;
  service_end_date?: unknown;
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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const supabase = (await import('@/lib/supabase/server')).getSupabaseAdminClient();
    const result = await rejoinEndedSubscriber(supabase, id, {
      product_name: str(body.product_name) || undefined,
      payment_method: str(body.payment_method) || undefined,
      payment_amount: typeof body.payment_amount === 'number' ? body.payment_amount : undefined,
      paid_at: str(body.paid_at) || undefined,
      service_start_date: str(body.service_start_date) || undefined,
      service_end_date: str(body.service_end_date) || undefined,
      admin_memo: str(body.admin_memo) || undefined,
    });

    return NextResponse.json({ success: true, subscriberId: result.subscriberId });
  } catch (error) {
    console.error('[admin/ended-subscribers/:id/rejoin] failed', { id, error });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '재가입 처리에 실패했습니다.' },
      { status: 500 },
    );
  }
}
