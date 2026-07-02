const KAKAO_PAY_API_BASE = 'https://open-api.kakaopay.com/online/v1/payment';

export type KakaoPayReadyInput = {
  partnerOrderId: string;
  partnerUserId: string;
  itemName: string;
  totalAmount: number;
  approvalUrl: string;
  cancelUrl: string;
  failUrl: string;
};

export type KakaoPayReadyResult = {
  tid: string;
  nextRedirectPcUrl: string;
  nextRedirectMobileUrl: string;
  nextRedirectAppUrl: string;
  androidAppScheme: string;
  iosAppScheme: string;
  createdAt: string;
};

export type KakaoPayApproveInput = {
  tid: string;
  partnerOrderId: string;
  partnerUserId: string;
  pgToken: string;
};

export type KakaoPayApproveResult = {
  tid: string;
  partner_order_id: string;
  partner_user_id: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  approved_at: string;
};

function getKakaoPayConfig() {
  const adminKey = process.env.KAKAO_PAY_ADMIN_KEY?.trim();
  const cid = process.env.KAKAO_PAY_CID?.trim() || 'TC0ONETIME';
  return { adminKey, cid };
}

export function isKakaoPayConfigured(): boolean {
  return Boolean(getKakaoPayConfig().adminKey);
}

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function kakaoPayFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { adminKey, cid } = getKakaoPayConfig();
  if (!adminKey) {
    throw new Error('KAKAO_PAY_ADMIN_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(`${KAKAO_PAY_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `SECRET_KEY ${adminKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cid, ...body }),
  });

  const data = (await response.json()) as T & { extras?: { method_result_message?: string } };
  if (!response.ok) {
    console.error('[kakao-pay] API error', { path, status: response.status, data });
    const message =
      (data as { extras?: { method_result_message?: string } }).extras?.method_result_message ??
      `Kakao Pay API failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function kakaoPayReady(input: KakaoPayReadyInput): Promise<KakaoPayReadyResult> {
  console.log('[kakao-pay] ready request', {
    partnerOrderId: input.partnerOrderId,
    totalAmount: input.totalAmount,
  });

  const data = await kakaoPayFetch<{
    tid: string;
    next_redirect_pc_url: string;
    next_redirect_mobile_url: string;
    next_redirect_app_url: string;
    android_app_scheme: string;
    ios_app_scheme: string;
    created_at: string;
  }>('/ready', {
    partner_order_id: input.partnerOrderId,
    partner_user_id: input.partnerUserId,
    item_name: input.itemName,
    quantity: 1,
    total_amount: input.totalAmount,
    tax_free_amount: 0,
    approval_url: input.approvalUrl,
    cancel_url: input.cancelUrl,
    fail_url: input.failUrl,
  });

  return {
    tid: data.tid,
    nextRedirectPcUrl: data.next_redirect_pc_url,
    nextRedirectMobileUrl: data.next_redirect_mobile_url,
    nextRedirectAppUrl: data.next_redirect_app_url,
    androidAppScheme: data.android_app_scheme,
    iosAppScheme: data.ios_app_scheme,
    createdAt: data.created_at,
  };
}

export async function kakaoPayApprove(input: KakaoPayApproveInput): Promise<KakaoPayApproveResult> {
  console.log('[kakao-pay] approve request', {
    tid: input.tid,
    partnerOrderId: input.partnerOrderId,
    pgTokenPresent: Boolean(input.pgToken),
  });

  const data = await kakaoPayFetch<KakaoPayApproveResult>('/approve', {
    tid: input.tid,
    partner_order_id: input.partnerOrderId,
    partner_user_id: input.partnerUserId,
    pg_token: input.pgToken,
  });

  console.log('[kakao-pay] approve success', {
    tid: data.tid,
    total: data.amount?.total,
    approvedAt: data.approved_at,
  });

  return data;
}
