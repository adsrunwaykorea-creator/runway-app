import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { completePayment } from '@/lib/payment/complete-payment';
import {
  formatPaymentMigrationMessage,
  isMissingColumnError,
  isPaymentSchemaOutdated,
} from '@/lib/payment/payment-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CompleteKakaoPaymentInput = {
  paymentRequestId: string;
  kakaoTid: string;
  partnerOrderId: string;
  partnerUserId: string;
  paidAmount: number;
  paidAt?: string;
};

export type CompleteKakaoPaymentResult = {
  paymentHistoryId: string;
  consultationLeadId: string | null;
  alreadyProcessed: boolean;
};

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export async function findConsultationLeadId(
  supabase: SupabaseClient,
  name: string,
  phone: string,
): Promise<string | null> {
  const digits = normalizePhone(phone);
  if (!digits) return null;

  const { data, error } = await supabase
    .from('consultation_leads')
    .select('id, phone, lead_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[completeKakaoPayment] lead lookup failed', error);
    return null;
  }

  const trimmedName = name.trim();
  const matched = (data ?? []).find((row) => {
    const rowDigits = normalizePhone(String(row.phone ?? ''));
    const rowName = String(row.lead_name ?? '').trim();
    if (rowDigits && rowDigits === digits) return true;
    if (trimmedName && rowName === trimmedName && rowDigits.slice(-4) === digits.slice(-4)) return true;
    return false;
  });

  return matched?.id ?? null;
}

export async function completeKakaoPayment(
  supabase: SupabaseClient,
  input: CompleteKakaoPaymentInput,
): Promise<CompleteKakaoPaymentResult> {
  const paidAt = input.paidAt ?? new Date().toISOString();

  console.log('[completeKakaoPayment] start', {
    paymentRequestId: input.paymentRequestId,
    kakaoTid: input.kakaoTid,
    partnerOrderId: input.partnerOrderId,
    paidAmount: input.paidAmount,
  });

  const historyProbe = await supabase.from('payment_history').select('id').limit(1);
  if (historyProbe.error && isPaymentSchemaOutdated(historyProbe.error)) {
    console.error('[completeKakaoPayment] payment_history table missing', historyProbe.error);
    throw new Error(formatPaymentMigrationMessage(['payment_history 테이블']));
  }

  const { data: existingHistory, error: existingHistoryError } = await supabase
    .from('payment_history')
    .select('id, consultation_id')
    .eq('kakao_tid', input.kakaoTid)
    .maybeSingle();

  if (existingHistoryError) {
    console.error('[completeKakaoPayment] payment_history lookup failed', existingHistoryError);
    throw new Error('결제 내역 조회에 실패했습니다.');
  }

  if (existingHistory?.id) {
    console.log('[completeKakaoPayment] already processed', { tid: input.kakaoTid });
    return {
      paymentHistoryId: existingHistory.id,
      consultationLeadId: existingHistory.consultation_id ?? null,
      alreadyProcessed: true,
    };
  }

  const result = await completePayment(supabase, {
    paymentRequestId: input.paymentRequestId,
    paymentChannel: 'kakao_pay',
    paidAmount: input.paidAmount,
    paidAt,
    kakaoTid: input.kakaoTid,
    partnerOrderId: input.partnerOrderId,
    partnerUserId: input.partnerUserId,
  });

  return {
    paymentHistoryId: result.paymentHistoryId,
    consultationLeadId: result.consultationLeadId,
    alreadyProcessed: result.alreadyProcessed,
  };
}
