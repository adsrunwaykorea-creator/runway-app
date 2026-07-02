export const PAYMENT_REQUEST_LEGACY_SELECT =
  'id, name, phone, email, company, business_type, message, product_name, amount, vat_included, service_period, payment_method, privacy_agreed, terms_agreed, status, created_at, updated_at' as const;

export const PAYMENT_REQUEST_SELECT =
  'id, name, phone, email, company, business_type, message, product_name, amount, vat_included, service_period, payment_method, payment_channel, payment_status, paid_at, depositor_name, tax_invoice_required, admin_memo, consultation_lead_id, privacy_agreed, terms_agreed, status, created_at, updated_at' as const;

export const PAYMENT_REQUEST_PENDING_STATUSES = ['입금대기', '결제요청', '결제대기'] as const;

export { isMissingColumnError as isPaymentRequestsSchemaOutdated } from '@/lib/payment/payment-schema';
