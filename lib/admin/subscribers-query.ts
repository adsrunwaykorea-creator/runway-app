export const SUBSCRIBERS_TABLE = 'subscribers' as const;

export const SUBSCRIBER_SELECT =
  'id, consultation_id, created_at, updated_at, name, phone, company, business_type, product_name, payment_method, payment_amount, paid_at, service_start_date, service_end_date, service_status, admin_memo' as const;

export const ENDED_SUBSCRIBERS_TABLE = 'ended_subscribers' as const;

export const ENDED_SUBSCRIBER_SELECT =
  'id, subscriber_id, consultation_id, name, phone, company, business_type, product_name, payment_amount, service_start_date, service_end_date, ended_at, end_reason, admin_memo, created_at' as const;

export { isMissingTableError } from '@/lib/payment/payment-schema';
