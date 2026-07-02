import { NextResponse } from 'next/server';
import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { findConsultationLeadId } from '@/lib/payment/complete-kakao-payment';
import { formatPaymentMigrationMessage, isMissingColumnError } from '@/lib/payment/payment-schema';
import {
  getSiteBaseUrl,
  isKakaoPayConfigured,
  kakaoPayReady,
} from '@/lib/kakao-pay/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  requestId?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

type PaymentRequestReadyRow = {
  id: string;
  name: string;
  phone: string;
  product_name: string;
  amount: number;
  payment_status?: string | null;
  consultation_lead_id?: string | null;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const requestId = str(body.requestId);
  if (!requestId) {
    return NextResponse.json({ success: false, message: '결제 신청 ID가 필요합니다.' }, { status: 400 });
  }

  if (!isKakaoPayConfigured()) {
    console.error('[checkout/kakao-pay-ready] KAKAO_PAY_ADMIN_KEY missing');
    return NextResponse.json(
      { success: false, message: '카카오페이 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    const extendedLookup = await supabase
      .from('payment_requests')
      .select('id, name, phone, product_name, amount, payment_status, consultation_lead_id')
      .eq('id', requestId)
      .maybeSingle();

    let row: PaymentRequestReadyRow | null = extendedLookup.data as PaymentRequestReadyRow | null;
    if (extendedLookup.error && isMissingColumnError(extendedLookup.error, 'payment_status')) {
      console.warn('[checkout/kakao-pay-ready] legacy schema lookup');
      const legacyLookup = await supabase
        .from('payment_requests')
        .select('id, name, phone, product_name, amount')
        .eq('id', requestId)
        .maybeSingle();
      row = legacyLookup.data as PaymentRequestReadyRow | null;
      if (legacyLookup.error || !row) {
        console.error('[checkout/kakao-pay-ready] request not found', { requestId, error: legacyLookup.error });
        return NextResponse.json(
          {
            success: false,
            message: formatPaymentMigrationMessage(['payment_requests 결제 컬럼']),
          },
          { status: 503 },
        );
      }
    } else if (extendedLookup.error || !row) {
      console.error('[checkout/kakao-pay-ready] request not found', { requestId, error: extendedLookup.error });
      return NextResponse.json({ success: false, message: '결제 신청 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (row.payment_status === 'paid') {
      return NextResponse.json({ success: false, message: '이미 결제가 완료된 신청입니다.' }, { status: 409 });
    }

    let consultationLeadId = row.consultation_lead_id as string | null;
    if (!consultationLeadId) {
      consultationLeadId = await findConsultationLeadId(supabase, String(row.name), String(row.phone));
    }

    const partnerOrderId = String(row.id);
    const partnerUserId = String(row.phone).replace(/[^0-9]/g, '') || String(row.id);
    const amount = Number(row.amount) || KAKAO_PAY_CHECKOUT_PRODUCT.amount;
    const baseUrl = getSiteBaseUrl();

    const ready = await kakaoPayReady({
      partnerOrderId,
      partnerUserId,
      itemName: String(row.product_name ?? KAKAO_PAY_CHECKOUT_PRODUCT.name),
      totalAmount: amount,
      approvalUrl: `${baseUrl}/checkout/success`,
      cancelUrl: `${baseUrl}/checkout?cancelled=1`,
      failUrl: `${baseUrl}/checkout?failed=1`,
    });

    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        kakao_tid: ready.tid,
        partner_order_id: partnerOrderId,
        partner_user_id: partnerUserId,
        consultation_lead_id: consultationLeadId,
        status: '결제대기',
        payment_status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      console.error('[checkout/kakao-pay-ready] payment_requests update failed', {
        requestId: row.id,
        code: updateError.code,
        message: updateError.message,
        hint: updateError.hint,
      });
      if (isMissingColumnError(updateError, 'kakao_tid')) {
        return NextResponse.json(
          {
            success: false,
            message: formatPaymentMigrationMessage(['payment_requests 결제 컬럼(kakao_tid 등)']),
          },
          { status: 503 },
        );
      }
    }

    console.log('[checkout/kakao-pay-ready] success', {
      requestId: row.id,
      tid: ready.tid,
      consultationLeadId,
    });

    return NextResponse.json({
      success: true,
      tid: ready.tid,
      redirectUrl: ready.nextRedirectMobileUrl || ready.nextRedirectPcUrl,
      redirectPcUrl: ready.nextRedirectPcUrl,
      redirectMobileUrl: ready.nextRedirectMobileUrl,
    });
  } catch (error) {
    console.error('[checkout/kakao-pay-ready] unexpected error', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '카카오페이 결제 준비에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
