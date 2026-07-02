import { CHECKOUT_PRODUCT_NAME, KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { CONSULTATION_LEADS_TABLE } from '@/lib/admin/consultation-leads-query';
import { SUBSCRIBERS_TABLE } from '@/lib/admin/subscribers-query';
import { addServiceDays } from '@/lib/payment/payment-constants';
import type { SubscriberRow } from '@/types/subscriber';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ORPHAN_SUBSCRIBER_ID_PREFIX = 'orphan:' as const;

export const ORPHAN_CONSULTATION_STATUSES = ['가입자등록완료', '가입완료'] as const;

export type OrphanLeadRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  lead_name: string | null;
  phone: string | null;
  company: string | null;
  company_name: string | null;
  business_type: string | null;
  service_type: string | null;
  admin_memo: string | null;
  status: string | null;
};

export function isOrphanSubscriberRow(row: SubscriberRow): boolean {
  return row.source === 'consultation_orphan' || row.id.startsWith(ORPHAN_SUBSCRIBER_ID_PREFIX);
}

export function orphanConsultationIdFromRow(row: SubscriberRow): string | null {
  if (row.consultation_id) return row.consultation_id;
  if (row.id.startsWith(ORPHAN_SUBSCRIBER_ID_PREFIX)) {
    return row.id.slice(ORPHAN_SUBSCRIBER_ID_PREFIX.length);
  }
  return null;
}

function leadName(lead: OrphanLeadRow): string {
  return lead.lead_name?.trim() || lead.phone?.trim() || '고객';
}

function leadPhone(lead: OrphanLeadRow): string {
  return lead.phone?.trim() || '-';
}

function leadCompany(lead: OrphanLeadRow): string | null {
  return lead.company_name?.trim() || lead.company?.trim() || null;
}

export function mapConsultationLeadToOrphanSubscriber(lead: OrphanLeadRow): SubscriberRow {
  const updatedAt = lead.updated_at ?? lead.created_at;
  return {
    id: `${ORPHAN_SUBSCRIBER_ID_PREFIX}${lead.id}`,
    consultation_id: lead.id,
    created_at: lead.created_at,
    updated_at: updatedAt,
    name: leadName(lead),
    phone: leadPhone(lead),
    company: leadCompany(lead),
    business_type: lead.business_type,
    product_name: lead.service_type?.trim() || CHECKOUT_PRODUCT_NAME,
    payment_method: 'bank_transfer',
    payment_amount: 0,
    paid_at: updatedAt,
    service_start_date: null,
    service_end_date: null,
    service_status: '보류',
    admin_memo: lead.admin_memo,
    source: 'consultation_orphan',
  };
}

export async function fetchOrphanConsultationLeads(
  supabase: SupabaseClient,
  subscribedConsultationIds: Set<string>,
): Promise<OrphanLeadRow[]> {
  const { data, error } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select(
      'id, created_at, updated_at, lead_name, phone, company, company_name, business_type, service_type, admin_memo, status',
    )
    .in('status', [...ORPHAN_CONSULTATION_STATUSES]);

  if (error) {
    console.error('[fetchOrphanConsultationLeads] failed', error);
    return [];
  }

  return ((data as OrphanLeadRow[]) ?? []).filter((lead) => !subscribedConsultationIds.has(lead.id));
}

export function buildDefaultRecoverInput(lead: OrphanLeadRow) {
  const baseDate = new Date(lead.updated_at ?? lead.created_at);
  const serviceStart = baseDate.toISOString();
  const serviceEnd = addServiceDays(baseDate, KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays).toISOString();

  return {
    product_name: lead.service_type?.trim() || CHECKOUT_PRODUCT_NAME,
    payment_method: 'bank_transfer',
    payment_amount: 0,
    paid_at: serviceStart,
    service_start_date: serviceStart,
    service_end_date: serviceEnd,
    admin_memo: lead.admin_memo ? `${lead.admin_memo}\n(가입자 데이터 복구)` : '가입자 데이터 복구',
  };
}
