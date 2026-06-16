export const CONSULTATION_LEAD_STATUSES = [
  '신규',
  '연락완료',
  '상담완료',
  '계약완료',
  '보류',
  '부재',
] as const;

export type ConsultationLeadStatus = (typeof CONSULTATION_LEAD_STATUSES)[number];

export type ConsultationLeadRow = {
  id: string;
  created_at: string;
  lead_name: string | null;
  phone: string | null;
  company: string | null;
  business_type: string;
  region: string;
  ad_channel: string | null;
  monthly_budget: string;
  message: string | null;
  goal: string | null;
  page_source: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: ConsultationLeadStatus;
  admin_memo: string | null;
  source: string;
  service_type: string | null;
};
