import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { findConsultationLeadId } from '@/lib/payment/complete-kakao-payment';
import { addServiceDays, normalizePaymentChannel, type PaymentChannel } from '@/lib/payment/payment-constants';
import {
  formatPaymentMigrationMessage,
  isMissingColumnError,
  isPaymentSchemaOutdated,
} from '@/lib/payment/payment-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CompletePaymentInput = {
  paymentRequestId: string;
  paymentChannel: PaymentChannel | string;
  paidAmount: number;
  paidAt?: string;
  depositorName?: string | null;
  taxInvoiceRequired?: boolean;
  kakaoTid?: string | null;
  partnerOrderId?: string | null;
  partnerUserId?: string | null;
  servicePeriodDays?: number;
};

export type CompletePaymentResult = {
  paymentHistoryId: string;
  consultationLeadId: string | null;
  alreadyProcessed: boolean;
};

export async function completePayment(
  supabase: SupabaseClient,
  input: CompletePaymentInput,
): Promise<CompletePaymentResult> {
  const paidAt = input.paidAt ?? new Date().toISOString();
  const paymentChannel = normalizePaymentChannel(String(input.paymentChannel));
  const serviceDays = input.servicePeriodDays ?? KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays;
  const serviceStart = new Date(paidAt);
  const serviceEnd = addServiceDays(serviceStart, serviceDays);
  const nextDue = new Date(serviceEnd);

  console.log('[completePayment] start', {
    paymentRequestId: input.paymentRequestId,
    paymentChannel,
    paidAmount: input.paidAmount,
  });

  const historyProbe = await supabase.from('payment_history').select('id').limit(1);
  if (historyProbe.error && isPaymentSchemaOutdated(historyProbe.error)) {
    throw new Error(formatPaymentMigrationMessage(['payment_history 테이블']));
  }

  const tidKey = input.kakaoTid ?? `manual-${input.paymentRequestId}`;

  const { data: existingHistory, error: existingHistoryError } = await supabase
    .from('payment_history')
    .select('id, consultation_id')
    .eq('payment_request_id', input.paymentRequestId)
    .eq('payment_status', 'paid')
    .maybeSingle();

  if (existingHistoryError) {
    console.error('[completePayment] payment_history lookup failed', existingHistoryError);
    throw new Error('결제 내역 조회에 실패했습니다.');
  }

  if (existingHistory?.id) {
    console.log('[completePayment] already processed', { paymentRequestId: input.paymentRequestId });
    return {
      paymentHistoryId: existingHistory.id,
      consultationLeadId: existingHistory.consultation_id ?? null,
      alreadyProcessed: true,
    };
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('payment_requests')
    .select(
      'id, name, phone, company, business_type, product_name, amount, consultation_lead_id, payment_status, depositor_name, tax_invoice_required',
    )
    .eq('id', input.paymentRequestId)
    .maybeSingle();

  if (requestError && isMissingColumnError(requestError, 'payment_status')) {
    throw new Error(formatPaymentMigrationMessage(['payment_requests 결제 컬럼']));
  }

  if (requestError || !requestRow) {
    console.error('[completePayment] payment_request not found', {
      paymentRequestId: input.paymentRequestId,
      requestError,
    });
    throw new Error('결제 신청 정보를 찾을 수 없습니다.');
  }

  let consultationLeadId = requestRow.consultation_lead_id as string | null;
  if (!consultationLeadId) {
    consultationLeadId = await findConsultationLeadId(
      supabase,
      String(requestRow.name),
      String(requestRow.phone),
    );
  }

  const productName = String(requestRow.product_name ?? KAKAO_PAY_CHECKOUT_PRODUCT.name);
  const amount = input.paidAmount || Number(requestRow.amount) || KAKAO_PAY_CHECKOUT_PRODUCT.amount;
  const depositorName = input.depositorName ?? requestRow.depositor_name ?? null;
  const taxInvoiceRequired = input.taxInvoiceRequired ?? requestRow.tax_invoice_required ?? false;

  const historyInsert: Record<string, unknown> = {
    customer_name: requestRow.name,
    customer_phone: requestRow.phone,
    company_name: requestRow.company,
    business_type: requestRow.business_type,
    product_name: productName,
    amount,
    payment_method: paymentChannel,
    payment_status: 'paid',
    paid_at: paidAt,
    depositor_name: depositorName,
    tax_invoice_required: taxInvoiceRequired,
    service_start_date: serviceStart.toISOString(),
    service_end_date: serviceEnd.toISOString(),
    next_payment_due_date: nextDue.toISOString(),
    management_status: '서비스중',
    consultation_id: consultationLeadId,
    payment_request_id: requestRow.id,
    kakao_tid: input.kakaoTid ?? null,
    partner_order_id: input.partnerOrderId ?? requestRow.id,
    partner_user_id: input.partnerUserId ?? null,
  };

  let { data: historyRow, error: historyError } = await supabase
    .from('payment_history')
    .insert(historyInsert)
    .select('id')
    .single();

  if (historyError && isMissingColumnError(historyError, 'management_status')) {
    const legacyInsert = { ...historyInsert };
    delete legacyInsert.business_type;
    delete legacyInsert.depositor_name;
    delete legacyInsert.tax_invoice_required;
    delete legacyInsert.service_start_date;
    delete legacyInsert.service_end_date;
    delete legacyInsert.next_payment_due_date;
    delete legacyInsert.management_status;
    delete legacyInsert.admin_memo;
    ({ data: historyRow, error: historyError } = await supabase
      .from('payment_history')
      .insert(legacyInsert)
      .select('id')
      .single());
  }

  if (historyError || !historyRow) {
    console.error('[completePayment] payment_history insert failed', historyError);
    throw new Error('결제 내역 저장에 실패했습니다.');
  }

  const requestUpdate: Record<string, unknown> = {
    status: '결제완료',
    payment_status: 'paid',
    payment_channel: paymentChannel,
    paid_at: paidAt,
    payment_amount: amount,
    depositor_name: depositorName,
    tax_invoice_required: taxInvoiceRequired,
    consultation_lead_id: consultationLeadId,
    updated_at: paidAt,
  };

  if (input.kakaoTid) {
    requestUpdate.kakao_tid = input.kakaoTid;
    requestUpdate.partner_order_id = input.partnerOrderId ?? requestRow.id;
    requestUpdate.partner_user_id = input.partnerUserId ?? null;
  }

  const { error: requestUpdateError } = await supabase
    .from('payment_requests')
    .update(requestUpdate)
    .eq('id', requestRow.id);

  if (requestUpdateError) {
    console.error('[completePayment] payment_requests update failed', requestUpdateError);
  }

  if (consultationLeadId) {
    const { error: leadUpdateError } = await supabase
      .from('consultation_leads')
      .update({
        status: '결제완료',
        payment_status: 'paid',
        paid_at: paidAt,
        payment_method: paymentChannel,
        payment_amount: amount,
        kakao_payment_id: input.kakaoTid ?? null,
        updated_at: paidAt,
      })
      .eq('id', consultationLeadId);

    if (leadUpdateError) {
      console.error('[completePayment] consultation_leads update failed', leadUpdateError);
    }
  }

  console.log('[completePayment] success', {
    paymentHistoryId: historyRow.id,
    consultationLeadId,
    paymentChannel,
    amount,
  });

  return {
    paymentHistoryId: historyRow.id,
    consultationLeadId,
    alreadyProcessed: false,
  };
}
