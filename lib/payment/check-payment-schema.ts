import type { PaymentSchemaStatus } from '@/lib/payment/payment-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkPaymentSchema(supabase: SupabaseClient): Promise<PaymentSchemaStatus> {
  const missingItems: string[] = [];

  const historyProbe = await supabase.from('payment_history').select('id').limit(1);
  const paymentHistoryTableExists = !historyProbe.error;
  if (!paymentHistoryTableExists) {
    missingItems.push('payment_history 테이블');
  }

  const requestProbe = await supabase
    .from('payment_requests')
    .select('payment_status, kakao_tid, consultation_lead_id')
    .limit(1);
  const paymentRequestsExtendedColumns = !requestProbe.error;
  if (!paymentRequestsExtendedColumns) {
    missingItems.push('payment_requests 결제 컬럼(payment_status, kakao_tid 등)');
  }

  const leadProbe = await supabase
    .from('consultation_leads')
    .select('payment_status, paid_at, payment_method')
    .limit(1);
  const consultationLeadsPaymentColumns = !leadProbe.error;
  if (!consultationLeadsPaymentColumns) {
    missingItems.push('consultation_leads 결제 컬럼');
  }

  return {
    migrationRequired: missingItems.length > 0,
    paymentHistoryTableExists,
    paymentRequestsExtendedColumns,
    consultationLeadsPaymentColumns,
    missingItems,
  };
}
