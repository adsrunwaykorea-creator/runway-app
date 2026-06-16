export type PaymentRequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string | null;
  business_type: string | null;
  message: string | null;
  product_name: string;
  amount: number;
  vat_included: boolean;
  service_period: string | null;
  payment_method: string;
  privacy_agreed: boolean;
  terms_agreed: boolean;
  status: string;
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
