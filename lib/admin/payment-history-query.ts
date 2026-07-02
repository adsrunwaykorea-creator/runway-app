export const PAYMENT_HISTORY_SELECT =
  'id, customer_name, customer_phone, company_name, business_type, product_name, amount, payment_method, payment_status, paid_at, depositor_name, tax_invoice_required, service_start_date, service_end_date, next_payment_due_date, management_status, admin_memo, consultation_id, payment_request_id, kakao_tid, partner_order_id, partner_user_id, created_at' as const;

export const PAYMENT_HISTORY_LEGACY_SELECT =
  'id, customer_name, customer_phone, company_name, product_name, amount, payment_method, payment_status, paid_at, consultation_id, payment_request_id, kakao_tid, partner_order_id, partner_user_id, created_at' as const;
