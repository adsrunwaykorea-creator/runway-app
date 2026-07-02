import { NextResponse } from 'next/server';
import { PAYMENT_HISTORY_SELECT } from '@/lib/admin/payment-history-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { PAYMENT_MANAGEMENT_STATUSES } from '@/lib/payment/payment-constants';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type PatchBody = {
  admin_memo?: unknown;
  management_status?: unknown;
  service_start_date?: unknown;
  service_end_date?: unknown;
  next_payment_due_date?: unknown;
  depositor_name?: unknown;
  tax_invoice_required?: unknown;
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
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.admin_memo !== undefined) updates.admin_memo = str(body.admin_memo);
  if (body.depositor_name !== undefined) updates.depositor_name = str(body.depositor_name) || null;
  if (body.tax_invoice_required !== undefined) updates.tax_invoice_required = body.tax_invoice_required === true;

  if (body.management_status !== undefined) {
    const status = str(body.management_status);
    if (!PAYMENT_MANAGEMENT_STATUSES.includes(status as (typeof PAYMENT_MANAGEMENT_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: '관리상태 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.management_status = status;
  }

  if (body.service_start_date !== undefined) {
    updates.service_start_date = str(body.service_start_date) || null;
  }
  if (body.service_end_date !== undefined) {
    updates.service_end_date = str(body.service_end_date) || null;
  }
  if (body.next_payment_due_date !== undefined) {
    updates.next_payment_due_date = str(body.next_payment_due_date) || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, message: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('payment_history')
      .update(updates)
      .eq('id', id)
      .select(PAYMENT_HISTORY_SELECT)
      .maybeSingle();

    if (error) {
      console.error('[admin/payment-history/:id] update failed', error);
      return NextResponse.json(
        { success: false, message: '결제 완료 고객 정보를 저장하지 못했습니다.' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ success: false, message: '결제 완료 고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, payment: data });
  } catch (error) {
    console.error('[admin/payment-history/:id] PATCH threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
