import { NextResponse } from 'next/server';
import { PAYMENT_REQUEST_SELECT } from '@/lib/admin/payment-requests-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { PAYMENT_CHANNELS, PAYMENT_REQUEST_STATUSES } from '@/lib/payment/payment-constants';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type PatchBody = {
  status?: unknown;
  payment_channel?: unknown;
  depositor_name?: unknown;
  tax_invoice_required?: unknown;
  admin_memo?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const VALID_CHANNELS = new Set(PAYMENT_CHANNELS.map((item) => item.value));

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
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    const status = str(body.status);
    if (!PAYMENT_REQUEST_STATUSES.includes(status as (typeof PAYMENT_REQUEST_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: '상태 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.status = status;
  }

  if (body.payment_channel !== undefined) {
    const channel = str(body.payment_channel);
    if (!VALID_CHANNELS.has(channel as (typeof PAYMENT_CHANNELS)[number]['value'])) {
      return NextResponse.json({ success: false, message: '결제수단 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.payment_channel = channel;
  }

  if (body.depositor_name !== undefined) updates.depositor_name = str(body.depositor_name) || null;
  if (body.tax_invoice_required !== undefined) updates.tax_invoice_required = body.tax_invoice_required === true;
  if (body.admin_memo !== undefined) updates.admin_memo = str(body.admin_memo);

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, message: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('payment_requests')
      .update(updates)
      .eq('id', id)
      .select(PAYMENT_REQUEST_SELECT)
      .maybeSingle();

    if (error) {
      console.error('[admin/payment-requests/:id] update failed', error);
      return NextResponse.json(
        { success: false, message: '결제 요청 정보를 저장하지 못했습니다.' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ success: false, message: '결제 요청을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    console.error('[admin/payment-requests/:id] PATCH threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
