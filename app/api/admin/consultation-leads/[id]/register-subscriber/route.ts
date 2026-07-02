import { NextResponse } from 'next/server';
import { CONSULTATION_LEADS_TABLE } from '@/lib/admin/consultation-leads-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { SUBSCRIBER_PAYMENT_CHANNELS } from '@/lib/subscriber/subscriber-constants';
import { registerSubscriberFromConsultation } from '@/lib/subscriber/register-subscriber';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  product_name?: unknown;
  payment_method?: unknown;
  payment_amount?: unknown;
  paid_at?: unknown;
  service_start_date?: unknown;
  service_end_date?: unknown;
  admin_memo?: unknown;
  lead?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const VALID_CHANNELS = new Set(SUBSCRIBER_PAYMENT_CHANNELS.map((item) => item.value));

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id: consultationId } = await context.params;
  if (!consultationId) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const productName = str(body.product_name);
  const paymentMethod = str(body.payment_method) || 'bank_transfer';
  const paidAt = str(body.paid_at);
  const serviceStart = str(body.service_start_date);
  const serviceEnd = str(body.service_end_date);

  if (!productName) {
    return NextResponse.json({ success: false, message: '상품명을 입력해 주세요.' }, { status: 400 });
  }
  if (!VALID_CHANNELS.has(paymentMethod as (typeof SUBSCRIBER_PAYMENT_CHANNELS)[number]['value'])) {
    return NextResponse.json({ success: false, message: '결제수단 값이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!paidAt || !serviceStart || !serviceEnd) {
    return NextResponse.json({ success: false, message: '결제일과 서비스 기간을 입력해 주세요.' }, { status: 400 });
  }

  const paymentAmount =
    typeof body.payment_amount === 'number' && body.payment_amount >= 0 ? body.payment_amount : 0;

  console.log('[admin/consultation-leads/:id/register-subscriber] start', {
    table: CONSULTATION_LEADS_TABLE,
    consultationId,
    productName,
    paymentMethod,
  });

  try {
    const supabase = getSupabaseAdminClient();
    const result = await registerSubscriberFromConsultation(supabase, consultationId, {
      product_name: productName,
      payment_method: paymentMethod,
      payment_amount: paymentAmount,
      paid_at: paidAt,
      service_start_date: serviceStart,
      service_end_date: serviceEnd,
      admin_memo: str(body.admin_memo) || undefined,
    });

    return NextResponse.json({ success: true, subscriberId: result.subscriberId });
  } catch (error) {
    console.error('[admin/consultation-leads/:id/register-subscriber] failed', {
      table: CONSULTATION_LEADS_TABLE,
      consultationId,
      error,
    });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '가입자 등록에 실패했습니다.' },
      { status: 500 },
    );
  }
}
