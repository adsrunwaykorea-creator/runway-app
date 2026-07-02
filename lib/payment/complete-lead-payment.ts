import { CHECKOUT_PRODUCT_NAME } from '@/lib/checkout/kakao-pay-product';
import {
  CONSULTATION_LEADS_TABLE,
  type ConsultationLeadSnapshot,
} from '@/lib/admin/consultation-leads-query';
import { addServiceDays } from '@/lib/payment/payment-constants';
import {
  formatPaymentMigrationMessage,
  isMissingColumnError,
  isPaymentSchemaOutdated,
} from '@/lib/payment/payment-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MANUAL_PAYMENT_METHOD = 'manual';

export type CompleteLeadPaymentResult = {
  paymentHistoryId: string;
  alreadyProcessed: boolean;
};

type LeadRow = ConsultationLeadSnapshot & {
  id: string;
};

function asLeadRow(value: Record<string, unknown>): LeadRow {
  return value as LeadRow;
}

function leadDisplayName(lead: LeadRow): string {
  return lead.lead_name?.trim() || lead.phone?.trim() || '고객';
}

function leadDisplayPhone(lead: LeadRow): string {
  return lead.phone?.trim() || '-';
}

function leadCompanyName(lead: LeadRow): string | null {
  return lead.company_name?.trim() || lead.company?.trim() || null;
}

async function fetchLeadRow(
  supabase: SupabaseClient,
  leadId: string,
): Promise<{ lead: LeadRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !data) {
    return { lead: null, error };
  }

  return { lead: asLeadRow(data as Record<string, unknown>), error: null };
}

async function updateLeadPaymentFields(
  supabase: SupabaseClient,
  leadId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from(CONSULTATION_LEADS_TABLE).update(fields).eq('id', leadId);

  if (error && isMissingColumnError(error, 'payment_status')) {
    const { status, admin_memo, updated_at } = fields;
    await supabase
      .from(CONSULTATION_LEADS_TABLE)
      .update({ status, admin_memo, updated_at })
      .eq('id', leadId);
    return;
  }

  if (error) {
    console.error('[completeLeadPayment] consultation_leads update failed', {
      table: CONSULTATION_LEADS_TABLE,
      leadId,
      error,
    });
  }
}

export async function completeLeadPayment(
  supabase: SupabaseClient,
  leadId: string,
  options?: {
    adminMemo?: string;
    paidAt?: string;
    amount?: number;
    paymentMethod?: string;
    leadSnapshot?: ConsultationLeadSnapshot | Record<string, unknown>;
  },
): Promise<CompleteLeadPaymentResult> {
  const historyProbe = await supabase.from('payment_history').select('id').limit(1);
  if (historyProbe.error && isPaymentSchemaOutdated(historyProbe.error)) {
    throw new Error(formatPaymentMigrationMessage(['payment_history 테이블']));
  }

  let leadRow: LeadRow | null = options?.leadSnapshot
    ? asLeadRow({ ...options.leadSnapshot, id: leadId } as Record<string, unknown>)
    : null;
  let leadError: unknown = null;

  if (!leadRow) {
    const fetched = await fetchLeadRow(supabase, leadId);
    leadRow = fetched.lead;
    leadError = fetched.error;
  }

  if (leadError || !leadRow) {
    console.error('[completeLeadPayment] lead not found', {
      table: CONSULTATION_LEADS_TABLE,
      leadId,
      leadError,
      hasSnapshot: Boolean(options?.leadSnapshot),
    });
    throw new Error('상담신청 내역을 찾을 수 없습니다.');
  }

  const paidAt = options?.paidAt ?? leadRow.paid_at ?? new Date().toISOString();
  const paymentMethod = options?.paymentMethod ?? leadRow.payment_method ?? MANUAL_PAYMENT_METHOD;
  const amount =
    options?.amount ??
    (typeof leadRow.payment_amount === 'number' && leadRow.payment_amount > 0
      ? leadRow.payment_amount
      : 0);
  const adminMemo = options?.adminMemo ?? leadRow.admin_memo ?? null;
  const serviceStart = new Date(paidAt);
  const serviceEnd = addServiceDays(serviceStart, 30);
  const productName = leadRow.service_type?.trim() || CHECKOUT_PRODUCT_NAME;

  const { data: existingHistory, error: existingError } = await supabase
    .from('payment_history')
    .select('id')
    .eq('consultation_id', leadId)
    .eq('payment_status', 'paid')
    .maybeSingle();

  if (existingError) {
    console.error('[completeLeadPayment] payment_history lookup failed', {
      table: 'payment_history',
      leadId,
      error: existingError,
    });
    throw new Error('결제 완료 고객 조회에 실패했습니다.');
  }

  if (existingHistory?.id) {
    await updateLeadPaymentFields(supabase, leadId, {
      status: '결제완료',
      payment_status: 'paid',
      paid_at: paidAt,
      payment_method: paymentMethod,
      payment_amount: amount > 0 ? amount : leadRow.payment_amount,
      admin_memo: adminMemo,
      updated_at: new Date().toISOString(),
    });

    return { paymentHistoryId: existingHistory.id, alreadyProcessed: true };
  }

  const historyInsert: Record<string, unknown> = {
    customer_name: leadDisplayName(leadRow),
    customer_phone: leadDisplayPhone(leadRow),
    company_name: leadCompanyName(leadRow),
    business_type: leadRow.business_type,
    product_name: productName,
    amount,
    payment_method: paymentMethod,
    payment_status: 'paid',
    paid_at: paidAt,
    consultation_id: leadId,
    admin_memo: adminMemo,
    service_start_date: serviceStart.toISOString(),
    service_end_date: serviceEnd.toISOString(),
    next_payment_due_date: serviceEnd.toISOString(),
    management_status: '서비스중',
  };

  let { data: historyRow, error: historyError } = await supabase
    .from('payment_history')
    .insert(historyInsert)
    .select('id')
    .single();

  if (historyError && isMissingColumnError(historyError, 'management_status')) {
    const legacyInsert = { ...historyInsert };
    delete legacyInsert.business_type;
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
    console.error('[completeLeadPayment] payment_history insert failed', {
      table: 'payment_history',
      leadId,
      error: historyError,
    });
    throw new Error('결제 완료 고객 등록에 실패했습니다.');
  }

  await updateLeadPaymentFields(supabase, leadId, {
    status: '결제완료',
    payment_status: 'paid',
    paid_at: paidAt,
    payment_method: paymentMethod,
    payment_amount: amount,
    admin_memo: adminMemo,
    updated_at: paidAt,
  });

  console.log('[completeLeadPayment] success', {
    table: CONSULTATION_LEADS_TABLE,
    leadId,
    paymentHistoryId: historyRow.id,
    paymentMethod,
    amount,
  });

  return {
    paymentHistoryId: historyRow.id,
    alreadyProcessed: false,
  };
}

/** Backfill payment_history for leads already marked 결제완료. */
export async function syncPaidConsultationLeadsToHistory(supabase: SupabaseClient): Promise<void> {
  const historyProbe = await supabase.from('payment_history').select('id').limit(1);
  if (historyProbe.error && isPaymentSchemaOutdated(historyProbe.error)) {
    return;
  }

  const { data: paidLeads, error: leadsError } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('*')
    .eq('status', '결제완료');

  if (leadsError || !paidLeads?.length) {
    return;
  }

  const leadIds = paidLeads.map((row) => row.id as string);
  const { data: existingRows, error: existingError } = await supabase
    .from('payment_history')
    .select('consultation_id')
    .in('consultation_id', leadIds)
    .eq('payment_status', 'paid');

  if (existingError) {
    console.error('[syncPaidConsultationLeadsToHistory] lookup failed', existingError);
    return;
  }

  const syncedIds = new Set(
    (existingRows ?? [])
      .map((row) => row.consultation_id as string | null)
      .filter(Boolean),
  );

  for (const lead of paidLeads) {
    const leadId = lead.id as string;
    if (syncedIds.has(leadId)) continue;
    try {
      await completeLeadPayment(supabase, leadId, { leadSnapshot: lead });
    } catch (error) {
      console.error('[syncPaidConsultationLeadsToHistory] failed for lead', leadId, error);
    }
  }
}
