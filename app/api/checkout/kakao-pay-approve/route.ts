import { NextResponse } from 'next/server';
import { isKakaoPayConfigured, kakaoPayApprove } from '@/lib/kakao-pay/client';
import { completeKakaoPayment } from '@/lib/payment/complete-kakao-payment';
import {
  formatPaymentMigrationMessage,
  isMissingColumnError,
} from '@/lib/payment/payment-schema';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  pgToken?: unknown;
  partnerOrderId?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const pgToken = str(body.pgToken);
  const partnerOrderId = str(body.partnerOrderId);

  if (!pgToken || !partnerOrderId) {
    return NextResponse.json(
      { success: false, message: '결제 승인 정보(pg_token, partner_order_id)가 필요합니다.' },
      { status: 400 },
    );
  }

  if (!isKakaoPayConfigured()) {
    console.error('[checkout/kakao-pay-approve] KAKAO_PAY_ADMIN_KEY missing');
    return NextResponse.json(
      { success: false, message: '카카오페이 설정이 완료되지 않았습니다.' },
      { status: 503 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    let requestRow: {
      id: string;
      kakao_tid?: string | null;
      partner_user_id?: string | null;
      payment_status?: string | null;
      name: string;
      amount: number;
      product_name: string;
    } | null = null;

    const extendedLookup = await supabase
      .from('payment_requests')
      .select('id, kakao_tid, partner_user_id, payment_status, name, amount, product_name')
      .eq('id', partnerOrderId)
      .maybeSingle();

    if (extendedLookup.error && isMissingColumnError(extendedLookup.error, 'payment_status')) {
      console.warn('[checkout/kakao-pay-approve] legacy schema — payment_status column missing');
      const legacyLookup = await supabase
        .from('payment_requests')
        .select('id, name, amount, product_name')
        .eq('id', partnerOrderId)
        .maybeSingle();

      if (legacyLookup.error || !legacyLookup.data) {
        console.error('[checkout/kakao-pay-approve] payment_request lookup failed', {
          partnerOrderId,
          lookupError: legacyLookup.error,
        });
        return NextResponse.json(
          {
            success: false,
            message: formatPaymentMigrationMessage(['payment_requests 결제 컬럼', 'payment_history 테이블']),
          },
          { status: 503 },
        );
      }

      requestRow = legacyLookup.data;
    } else if (extendedLookup.error || !extendedLookup.data) {
      console.error('[checkout/kakao-pay-approve] payment_request lookup failed', {
        partnerOrderId,
        lookupError: extendedLookup.error,
      });
      return NextResponse.json({ success: false, message: '결제 신청 정보를 찾을 수 없습니다.' }, { status: 404 });
    } else {
      requestRow = extendedLookup.data;
    }

    if (!requestRow.kakao_tid) {
      console.error('[checkout/kakao-pay-approve] missing kakao_tid', {
        partnerOrderId,
        schemaHint: 'Run supabase/sql/019_payment_history_and_kakao_fields.sql and retry payment',
      });
      return NextResponse.json(
        {
          success: false,
          message:
            '카카오페이 결제 세션(tid)이 없습니다. Supabase에서 019_payment_history_and_kakao_fields.sql 실행 후 결제를 다시 시도해 주세요.',
        },
        { status: 400 },
      );
    }

    if (requestRow.payment_status === 'paid') {
      const result = await completeKakaoPayment(supabase, {
        paymentRequestId: requestRow.id,
        kakaoTid: String(requestRow.kakao_tid),
        partnerOrderId,
        partnerUserId: String(requestRow.partner_user_id ?? partnerOrderId),
        paidAmount: Number(requestRow.amount) || 0,
      });
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        paymentHistoryId: result.paymentHistoryId,
        summary: {
          name: requestRow.name,
          productName: requestRow.product_name,
          amount: requestRow.amount,
        },
      });
    }

    const partnerUserId = String(requestRow.partner_user_id ?? partnerOrderId);
    const approved = await kakaoPayApprove({
      tid: String(requestRow.kakao_tid),
      partnerOrderId,
      partnerUserId,
      pgToken,
    });

    console.log('[checkout/kakao-pay-approve] kakao approved', {
      partnerOrderId,
      tid: approved.tid,
      amount: approved.amount.total,
      approvedAt: approved.approved_at,
    });

    const result = await completeKakaoPayment(supabase, {
      paymentRequestId: requestRow.id,
      kakaoTid: approved.tid,
      partnerOrderId: approved.partner_order_id,
      partnerUserId: approved.partner_user_id,
      paidAmount: approved.amount.total,
      paidAt: approved.approved_at,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      paymentHistoryId: result.paymentHistoryId,
      consultationLeadId: result.consultationLeadId,
      summary: {
        name: requestRow.name,
        productName: requestRow.product_name,
        amount: approved.amount.total,
        paidAt: approved.approved_at,
      },
    });
  } catch (error) {
    console.error('[checkout/kakao-pay-approve] failed', {
      partnerOrderId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '카카오페이 결제 승인에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
