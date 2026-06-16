import { NextResponse } from 'next/server';
import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type Body = {
  productId?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  customerEmail?: unknown;
  businessName?: unknown;
  businessType?: unknown;
  message?: unknown;
  privacyAgreed?: unknown;
  termsAgreed?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function logSupabaseEnv() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[checkout/kakao-pay-request] env check', {
    NEXT_PUBLIC_SUPABASE_URL: hasUrl,
    SUPABASE_SERVICE_ROLE_KEY: hasServiceRole,
  });
  return { hasUrl, hasServiceRole };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch (parseError) {
    console.error('[checkout/kakao-pay-request] invalid JSON body', parseError);
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const productId = str(body.productId) || KAKAO_PAY_CHECKOUT_PRODUCT.id;
  if (productId !== KAKAO_PAY_CHECKOUT_PRODUCT.id) {
    return NextResponse.json({ success: false, message: '선택한 상품을 확인할 수 없습니다.' }, { status: 400 });
  }

  const name = str(body.customerName);
  const phone = str(body.customerPhone);
  const email = str(body.customerEmail);
  const company = str(body.businessName) || null;
  const businessType = str(body.businessType) || null;
  const message = str(body.message) || null;
  const privacyAgreed = body.privacyAgreed === true;
  const termsAgreed = body.termsAgreed === true;

  if (!name || !phone || !email) {
    return NextResponse.json(
      { success: false, message: '이름, 연락처, 이메일은 필수 항목입니다.' },
      { status: 400 },
    );
  }

  if (!privacyAgreed || !termsAgreed) {
    return NextResponse.json(
      { success: false, message: '약관에 모두 동의해 주세요.' },
      { status: 400 },
    );
  }

  const env = logSupabaseEnv();
  if (!env.hasUrl || !env.hasServiceRole) {
    console.error('[checkout/kakao-pay-request] missing Supabase env', env);
    return NextResponse.json(
      { success: false, message: '결제 신청 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  const now = new Date().toISOString();
  const row = {
    name,
    phone,
    email,
    company,
    business_type: businessType,
    message,
    product_name: KAKAO_PAY_CHECKOUT_PRODUCT.name,
    amount: KAKAO_PAY_CHECKOUT_PRODUCT.amount,
    vat_included: KAKAO_PAY_CHECKOUT_PRODUCT.vatIncluded,
    service_period: `결제일로부터 ${KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays}일`,
    payment_method: 'kakaopay',
    privacy_agreed: privacyAgreed,
    terms_agreed: termsAgreed,
    status: '결제요청',
    updated_at: now,
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('payment_requests')
      .insert(row)
      .select('id, created_at, product_name, amount, name')
      .single();

    if (error) {
      console.error('[checkout/kakao-pay-request] Supabase insert failed', {
        table: 'payment_requests',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { success: false, message: '결제 신청 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      requestId: data?.id ?? null,
      message: '결제 요청이 접수되었습니다. 담당자가 확인 후 결제 안내를 드리겠습니다.',
      summary: {
        name: data?.name ?? name,
        productName: data?.product_name ?? KAKAO_PAY_CHECKOUT_PRODUCT.name,
        amount: data?.amount ?? KAKAO_PAY_CHECKOUT_PRODUCT.amount,
        createdAt: data?.created_at ?? now,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[checkout/kakao-pay-request] unexpected error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { success: false, message: '결제 신청 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
