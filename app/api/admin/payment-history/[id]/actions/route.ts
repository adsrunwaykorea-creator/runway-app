import { NextResponse } from 'next/server';
import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { addServiceDays } from '@/lib/payment/payment-constants';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  action?: unknown;
  amount?: unknown;
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
    const supabase = getSupabaseAdminClient();
    const { data: payment, error: lookupError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (lookupError || !payment) {
      console.error('[admin/payment-history/:id/actions] lookup failed', lookupError);
      return NextResponse.json({ success: false, message: '결제 완료 고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'renew_request') {
      const { data: requestRow, error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          name: payment.customer_name,
          phone: payment.customer_phone,
          email: null,
          company: payment.company_name,
          business_type: payment.business_type,
          message: '재결제 요청',
          product_name: payment.product_name,
          amount: payment.amount,
          vat_included: true,
          service_period: `결제일로부터 ${KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays}일`,
          payment_method: payment.payment_method ?? 'bank_transfer',
          payment_channel: payment.payment_method ?? 'bank_transfer',
          privacy_agreed: true,
          terms_agreed: true,
          status: '결제요청',
          payment_status: 'pending',
          consultation_lead_id: payment.consultation_id,
          admin_memo: str(body.admin_memo) || '재결제 요청',
          updated_at: now,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[admin/payment-history/:id/actions] renew_request failed', insertError);
        return NextResponse.json({ success: false, message: '재결제 요청 생성에 실패했습니다.' }, { status: 500 });
      }

      await supabase
        .from('payment_history')
        .update({ management_status: '재결제대기', updated_at: now })
        .eq('id', id);

      return NextResponse.json({ success: true, action, paymentRequestId: requestRow.id });
    }

    if (action === 'add_payment') {
      const amount =
        typeof body.amount === 'number' && body.amount > 0 ? body.amount : Number(payment.amount);
      const paidAt = now;
      const serviceStart = new Date(paidAt);
      const serviceEnd = addServiceDays(serviceStart, KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays);

      const { data: newPayment, error: insertError } = await supabase
        .from('payment_history')
        .insert({
          customer_name: payment.customer_name,
          customer_phone: payment.customer_phone,
          company_name: payment.company_name,
          business_type: payment.business_type,
          product_name: payment.product_name,
          amount,
          payment_method: payment.payment_method ?? 'bank_transfer',
          payment_status: 'paid',
          paid_at: paidAt,
          depositor_name: payment.depositor_name,
          tax_invoice_required: payment.tax_invoice_required ?? false,
          service_start_date: serviceStart.toISOString(),
          service_end_date: serviceEnd.toISOString(),
          next_payment_due_date: serviceEnd.toISOString(),
          management_status: '서비스중',
          consultation_id: payment.consultation_id,
          admin_memo: str(body.admin_memo) || '추가 결제',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[admin/payment-history/:id/actions] add_payment failed', insertError);
        return NextResponse.json({ success: false, message: '결제 추가에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action, paymentHistoryId: newPayment.id });
    }

    if (action === 'refund') {
      const { error: updateError } = await supabase
        .from('payment_history')
        .update({
          payment_status: 'refunded',
          management_status: '환불',
          admin_memo: str(body.admin_memo) || payment.admin_memo,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[admin/payment-history/:id/actions] refund failed', updateError);
        return NextResponse.json({ success: false, message: '환불 처리에 실패했습니다.' }, { status: 500 });
      }

      if (payment.payment_request_id) {
        await supabase
          .from('payment_requests')
          .update({ status: '환불', payment_status: 'refunded', updated_at: now })
          .eq('id', payment.payment_request_id);
      }

      return NextResponse.json({ success: true, action });
    }

    if (action === 'end_service') {
      const { error: updateError } = await supabase
        .from('payment_history')
        .update({
          management_status: '서비스종료',
          service_end_date: now,
          admin_memo: str(body.admin_memo) || payment.admin_memo,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[admin/payment-history/:id/actions] end_service failed', updateError);
        return NextResponse.json({ success: false, message: '서비스 종료 처리에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action });
    }

    return NextResponse.json({ success: false, message: '지원하지 않는 action입니다.' }, { status: 400 });
  } catch (error) {
    console.error('[admin/payment-history/:id/actions] threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
