import { NextResponse } from 'next/server';
import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { getSupabaseLeadClient } from '@/lib/supabase/server';

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

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const productId = str(body.productId) || KAKAO_PAY_CHECKOUT_PRODUCT.id;
  if (productId !== KAKAO_PAY_CHECKOUT_PRODUCT.id) {
    return NextResponse.json({ success: false, message: '선택한 상품을 확인할 수 없습니다.' }, { status: 400 });
  }

  const customerName = str(body.customerName);
  const customerPhone = str(body.customerPhone);
  const customerEmail = str(body.customerEmail);
  const businessName = str(body.businessName) || null;
  const businessType = str(body.businessType) || null;
  const message = str(body.message) || null;
  const privacyAgreed = body.privacyAgreed === true;
  const termsAgreed = body.termsAgreed === true;

  if (!customerName || !customerPhone || !customerEmail) {
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

  const row = {
    product_id: KAKAO_PAY_CHECKOUT_PRODUCT.id,
    product_name: KAKAO_PAY_CHECKOUT_PRODUCT.name,
    amount: KAKAO_PAY_CHECKOUT_PRODUCT.amount,
    vat_included: KAKAO_PAY_CHECKOUT_PRODUCT.vatIncluded,
    service_period_days: KAKAO_PAY_CHECKOUT_PRODUCT.servicePeriodDays,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    business_name: businessName,
    business_type: businessType,
    message,
    payment_method: 'kakao_pay',
    status: 'pending',
    privacy_agreed: privacyAgreed,
    terms_agreed: termsAgreed,
  };

  try {
    const supabase = getSupabaseLeadClient();
    const { data, error } = await supabase.from('payment_requests').insert(row).select('id').single();

    if (error) {
      console.error('[checkout/kakao-pay-request] insert failed', error);
      return NextResponse.json(
        { success: false, message: '결제 신청 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      requestId: data?.id ?? null,
      message: '결제 요청이 접수되었습니다. 담당자가 확인 후 결제 안내를 드리겠습니다.',
    });
  } catch (error) {
    console.error('[checkout/kakao-pay-request] threw', error);
    return NextResponse.json(
      { success: false, message: '서버 설정을 확인해 주세요.' },
      { status: 503 },
    );
  }
}
