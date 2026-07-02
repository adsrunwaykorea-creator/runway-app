/** 전체 status 값 (DB constraint 기준) */
export const CONSULTATION_LEAD_STATUSES = [
  '신규',
  '상담중',
  '연락완료',
  '결제완료',
  '상담종료',
  '가입자등록완료',
] as const;

/** 상담신청 내역에 표시되는 status */
export const CONSULTATION_LEAD_ACTIVE_STATUSES = [
  '신규',
  '상담중',
  '연락완료',
  '결제완료',
] as const;

/** 관리자가 수동으로 변경 가능한 status (상담신청 내역) */
export const CONSULTATION_LEAD_MANUAL_STATUSES = [
  '신규',
  '상담중',
  '연락완료',
  '결제완료',
] as const;

export const CONSULTATION_LEAD_PAYMENT_STATUS = '결제완료' as const;
export const CONSULTATION_LEAD_ENDED_STATUS = '상담종료' as const;
export const CONSULTATION_LEAD_REGISTERED_STATUS = '가입자등록완료' as const;

export type ConsultationLeadStatus = (typeof CONSULTATION_LEAD_STATUSES)[number];
export type ConsultationLeadManualStatus = (typeof CONSULTATION_LEAD_MANUAL_STATUSES)[number];
export type ConsultationLeadActiveStatus = (typeof CONSULTATION_LEAD_ACTIVE_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, ConsultationLeadStatus> = {
  상담완료: '상담중',
  부재: '상담중',
  보류: '상담중',
  계약완료: '상담종료',
  가입완료: '가입자등록완료',
};

export function normalizeConsultationLeadStatus(status: string | null | undefined): string {
  const value = status?.trim() || '신규';
  return LEGACY_STATUS_MAP[value] ?? value;
}

/** DB 마이그레이션(026) 전 레거시 constraint 호환용 write 매핑 */
const LEGACY_STATUS_WRITE_MAP: Record<string, string> = {
  상담중: '상담완료',
  상담종료: '계약완료',
  가입자등록완료: '가입완료',
};

export function denormalizeConsultationLeadStatusForDb(status: string): string {
  return LEGACY_STATUS_WRITE_MAP[status] ?? status;
}

export function isActiveConsultationStatus(status: string | null | undefined): boolean {
  return (CONSULTATION_LEAD_ACTIVE_STATUSES as readonly string[]).includes(
    normalizeConsultationLeadStatus(status),
  );
}

export type ConsultationLeadRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  lead_name: string | null;
  phone: string | null;
  company: string | null;
  company_name: string | null;
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
  status: string;
  admin_memo: string | null;
  source: string;
  service_type: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_amount?: number | null;
};

export type RegisterSubscriberInput = {
  product_name: string;
  payment_method: string;
  payment_amount: number;
  paid_at: string;
  service_start_date: string;
  service_end_date: string;
  admin_memo?: string;
};

export type PaginatedListMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
