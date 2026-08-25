import type { SupabaseClient } from '@supabase/supabase-js';

export const CONSULTATION_LEADS_TABLE = 'consultation_leads' as const;

export const CONSULTATION_LEAD_SELECT =
  'id, created_at, updated_at, lead_name, phone, company, company_name, business_type, region, ad_channel, monthly_budget, message, goal, page_source, referrer, utm_source, utm_medium, utm_campaign, status, admin_memo, source, service_type' as const;

export const CONSULTATION_LEAD_ATTRIBUTION_SELECT =
  'utm_content, utm_term, fbclid, landing_page, first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_utm_term, first_fbclid, first_landing_page, first_referrer, first_visited_at, last_utm_source, last_utm_medium, last_utm_campaign, last_utm_content, last_utm_term, last_fbclid, last_landing_page, last_referrer, last_visited_at' as const;

export type ConsultationLeadSelectFields = {
  selectFields: string;
  hasCompanyNameColumn: boolean;
  hasPaymentStatusColumn: boolean;
  hasAttributionColumns: boolean;
};

export async function resolveConsultationLeadSelectFields(
  supabase: SupabaseClient,
): Promise<ConsultationLeadSelectFields> {
  const paymentStatusProbe = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('payment_status')
    .limit(1);
  const companyNameProbe = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('company_name')
    .limit(1);
  const attributionProbe = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('first_utm_source')
    .limit(1);

  const hasPaymentStatusColumn = !paymentStatusProbe.error;
  const hasCompanyNameColumn = !companyNameProbe.error;
  const hasAttributionColumns = !attributionProbe.error;

  let selectFields = hasCompanyNameColumn
    ? CONSULTATION_LEAD_SELECT
    : CONSULTATION_LEAD_SELECT.replace(', company_name', '');

  if (hasPaymentStatusColumn) {
    selectFields = `${selectFields}, payment_status, paid_at, payment_method, payment_amount`;
  }

  if (hasAttributionColumns) {
    selectFields = `${selectFields}, ${CONSULTATION_LEAD_ATTRIBUTION_SELECT}`;
  }

  return { selectFields, hasCompanyNameColumn, hasPaymentStatusColumn, hasAttributionColumns };
}

export type ConsultationLeadSnapshot = {
  id: string;
  lead_name?: string | null;
  phone?: string | null;
  company?: string | null;
  company_name?: string | null;
  business_type?: string | null;
  message?: string | null;
  service_type?: string | null;
  admin_memo?: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_amount?: number | null;
  status?: string | null;
};
