import type { PaymentChannel, PaymentManagementStatus } from '@/lib/payment/payment-constants';

export type PaymentHistoryRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  company_name: string | null;
  business_type: string | null;
  product_name: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  paid_at: string;
  depositor_name: string | null;
  tax_invoice_required: boolean | null;
  service_start_date: string | null;
  service_end_date: string | null;
  next_payment_due_date: string | null;
  management_status: PaymentManagementStatus | string;
  admin_memo: string | null;
  consultation_id: string | null;
  payment_request_id: string | null;
  kakao_tid: string | null;
  partner_order_id: string | null;
  partner_user_id: string | null;
  created_at: string;
  consultation_message?: string | null;
};

export type PaymentChannelValue = PaymentChannel;
