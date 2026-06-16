export const PAYMENT_REQUEST_STATUSES = ['pending', 'contacted', 'paid', 'cancelled'] as const;

export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

export type PaymentRequestRow = {
  id: string;
  created_at: string;
  product_id: string;
  product_name: string;
  amount: number;
  vat_included: boolean;
  service_period_days: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  business_name: string | null;
  business_type: string | null;
  message: string | null;
  payment_method: string;
  status: PaymentRequestStatus;
  privacy_agreed: boolean;
  terms_agreed: boolean;
};
