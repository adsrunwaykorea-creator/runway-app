export type OrderRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  is_guest?: boolean | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  business_name?: string | null;
  /** 확인서 수신 채널 (DB 컬럼명) */
  confirmation_channel?: 'kakao' | 'sms' | null;
  receipt_channel?: 'kakao' | 'sms' | null;
  receipt_sent?: boolean | null;
  receipt_sent_at?: string | null;
  receipt_last_error?: string | null;
  order_id?: string | null;
  payment_key?: string | null;
  service: 'SNS' | 'DB 마케팅';
  service_key?: string | null;
  period: 'monthly' | 'quarterly';
  /** 통일 권장: 실제 결제 금액(원) */
  amount?: number | null;
  /** 레거시 행 호환 */
  price?: number | null;
  created_at: string;
  expires_at: string | null;
  profiles?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};
