export const PAYMENT_MIGRATION_019_FILE = 'supabase/sql/019_payment_history_and_kakao_fields.sql';

export type PaymentSchemaStatus = {
  migrationRequired: boolean;
  paymentHistoryTableExists: boolean;
  paymentRequestsExtendedColumns: boolean;
  consultationLeadsPaymentColumns: boolean;
  missingItems: string[];
};

type SupabaseErrorLike = { code?: string; message?: string } | null;

export function isMissingColumnError(error: SupabaseErrorLike, column?: string): boolean {
  if (error?.code !== '42703') return false;
  if (!column) return true;
  return error.message?.includes(column) ?? false;
}

export function isMissingTableError(error: SupabaseErrorLike, table?: string): boolean {
  if (error?.code !== 'PGRST205') return false;
  if (!table) return true;
  return error.message?.includes(table) ?? false;
}

export function isPaymentSchemaOutdated(error: SupabaseErrorLike): boolean {
  return (
    isMissingTableError(error, 'payment_history') ||
    isMissingColumnError(error, 'payment_status') ||
    isMissingColumnError(error, 'kakao_tid') ||
    isMissingColumnError(error, 'consultation_lead_id')
  );
}

export const PAYMENT_MIGRATION_INSTRUCTIONS = [
  'Supabase 대시보드 → SQL Editor → New query',
  `프로젝트 파일 ${PAYMENT_MIGRATION_019_FILE} 내용 전체 복사 후 Run`,
  '실행 후 관리자 페이지를 새로고침',
  '이미 결제된 고객(예: 이윤우)은 supabase/sql/020_backfill_leeyunwoo_payment.sql 로 수동 반영 가능',
] as const;

export function formatPaymentMigrationMessage(missingItems: string[]): string {
  const items = missingItems.length > 0 ? missingItems.join(', ') : '결제 완료 스키마';
  return `DB에 ${items}이(가) 없습니다. Supabase SQL Editor에서 ${PAYMENT_MIGRATION_019_FILE} 을 실행해 주세요.`;
}
