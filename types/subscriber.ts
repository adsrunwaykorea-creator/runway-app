import type { PaymentChannel } from '@/lib/payment/payment-constants';

export type SubscriberRow = {
  id: string;
  consultation_id: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  company: string | null;
  business_type: string | null;
  product_name: string;
  payment_method: PaymentChannel | string;
  payment_amount: number;
  paid_at: string;
  service_start_date: string | null;
  service_end_date: string | null;
  service_status: string;
  admin_memo: string | null;
  /** subscribers 테이블 row 또는 consultation_leads 고아 가입자 */
  source?: 'subscriber' | 'consultation_orphan';
};

export type EndedSubscriberRow = {
  id: string;
  subscriber_id: string | null;
  consultation_id: string | null;
  name: string;
  phone: string;
  company: string | null;
  business_type: string | null;
  product_name: string;
  payment_amount: number;
  service_start_date: string | null;
  service_end_date: string | null;
  ended_at: string;
  end_reason: string | null;
  admin_memo: string | null;
  created_at: string;
};
