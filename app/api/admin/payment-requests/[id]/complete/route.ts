import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { completePayment } from '@/lib/payment/complete-payment';
import { normalizePaymentChannel } from '@/lib/payment/payment-constants';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  payment_channel?: unknown;
  depositor_name?: unknown;
  tax_invoice_required?: unknown;
  paid_amount?: unknown;
  paid_at?: unknown;
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
    const supabase = getSupabaseAdminClient();
    const { data: requestRow, error: lookupError } = await supabase
      .from('payment_requests')
      .select('id, amount, payment_status, status, payment_channel, depositor_name, tax_invoice_required')
      .eq('id', id)
      .maybeSingle();

    if (lookupError || !requestRow) {
      console.error('[admin/payment-requests/:id/complete] lookup failed', lookupError);
      return NextResponse.json({ success: false, message: '결제 요청을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (requestRow.payment_status === 'paid' || requestRow.status === '결제완료') {
      return NextResponse.json({ success: false, message: '이미 결제완료 처리된 건입니다.' }, { status: 409 });
    }

    const paymentChannel = normalizePaymentChannel(
      str(body.payment_channel) || String(requestRow.payment_channel ?? 'bank_transfer'),
    );
    const paidAmount =
      typeof body.paid_amount === 'number' && body.paid_amount > 0
        ? body.paid_amount
        : Number(requestRow.amount);

    const result = await completePayment(supabase, {
      paymentRequestId: id,
      paymentChannel,
      paidAmount,
      paidAt: str(body.paid_at) || undefined,
      depositorName: str(body.depositor_name) || requestRow.depositor_name || null,
      taxInvoiceRequired:
        body.tax_invoice_required === true || requestRow.tax_invoice_required === true,
    });

    console.log('[admin/payment-requests/:id/complete] success', {
      paymentRequestId: id,
      paymentHistoryId: result.paymentHistoryId,
      paymentChannel,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      paymentHistoryId: result.paymentHistoryId,
      consultationLeadId: result.consultationLeadId,
    });
  } catch (error) {
    console.error('[admin/payment-requests/:id/complete] failed', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '결제완료 처리에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
