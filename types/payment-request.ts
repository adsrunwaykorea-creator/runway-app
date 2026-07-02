import type { PaymentChannel, PaymentRequestStatus } from '@/lib/payment/payment-constants';

export type PaymentRequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  business_type: string | null;
  message: string | null;
  product_name: string;
  amount: number;
  vat_included: boolean;
  service_period: string | null;
  payment_method: string;
  payment_channel?: PaymentChannel | string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  depositor_name?: string | null;
  tax_invoice_required?: boolean | null;
  admin_memo?: string | null;
  consultation_lead_id?: string | null;
  privacy_agreed: boolean;
  terms_agreed: boolean;
  status: PaymentRequestStatus | string;
  created_at: string;
  updated_at: string;
};

export type CheckoutCompleteSummary = {
  name: string;
  productName: string;
  amount: number;
  createdAt: string;
};

export const CHECKOUT_COMPLETE_STORAGE_KEY = 'runway_checkout_complete';
