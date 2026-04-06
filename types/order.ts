export type OrderRow = {
  id: string;
  user_id: string;
  email: string;
  service: 'SNS' | 'DB 마케팅';
  service_key?: string | null;
  period: 'monthly' | 'quarterly';
  price: number;
  created_at: string;
  expires_at: string | null;
  profiles?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};
