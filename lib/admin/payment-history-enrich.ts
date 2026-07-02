import type { PaymentHistoryRow } from '@/types/payment-history';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function enrichPaymentsWithConsultationMessages(
  supabase: SupabaseClient,
  payments: PaymentHistoryRow[],
): Promise<PaymentHistoryRow[]> {
  const consultationIds = [
    ...new Set(
      payments
        .map((payment) => payment.consultation_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  if (consultationIds.length === 0) {
    return payments;
  }

  const { data: leads, error } = await supabase
    .from('consultation_leads')
    .select('id, message')
    .in('id', consultationIds);

  if (error) {
    console.error('[enrichPaymentsWithConsultationMessages] failed', error);
    return payments;
  }

  const messageByLeadId = new Map(
    (leads ?? []).map((lead) => [lead.id as string, (lead.message as string | null) ?? null]),
  );

  return payments.map((payment) => ({
    ...payment,
    consultation_message: payment.consultation_id
      ? messageByLeadId.get(payment.consultation_id) ?? null
      : null,
  }));
}
