import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';

type ConfirmRequestBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  order?: {
    service?: string;
    service_key?: string;
    period?: string;
    /** 결제 금액(원). 구 클라이언트는 price만 보낼 수 있음 */
    amount?: number;
    price?: number;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string | null;
    /** DB 컬럼 confirmation_channel — 요청에서는 receipt_channel 별칭 허용 */
    receipt_channel?: 'kakao' | 'sms';
    confirmation_channel?: 'kakao' | 'sms';
    business_name?: string | null;
  };
};

type TossKeyMode = 'test' | 'live' | 'unknown';

type OrderRowLike = {
  id: string;
  amount?: number | null;
  price?: number | null;
  service?: string | null;
};

/** 이용 만료: monthly = 결제 시점 + 30일, quarterly = + 90일 (마이페이지·운영 정책과 동일) */
function getExpiresAt(period: string, baseDate: Date) {
  const next = new Date(baseDate);
  if (period === 'monthly') {
    next.setDate(next.getDate() + 30);
    return next.toISOString();
  }
  if (period === 'quarterly') {
    next.setDate(next.getDate() + 90);
    return next.toISOString();
  }
  return null;
}

function detectTossKeyMode(key: string | undefined): TossKeyMode {
  if (!key) return 'unknown';
  if (key.startsWith('test_') || key.startsWith('test-') || key.includes('test_sk')) return 'test';
  if (key.startsWith('live_') || key.startsWith('live-') || key.includes('live_sk')) return 'live';
  return 'unknown';
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.TOSS_SECRET_KEY;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secretKeyMode = detectTossKeyMode(secretKey);
    const clientKeyMode = detectTossKeyMode(clientKey);
    const isTestMode = secretKeyMode === 'test';

    console.log('[STEP 1] env 확인 시작');
    console.log('[ENV_VALUES]', {
      hasTossSecretKey: Boolean(secretKey),
      hasTossClientKey: Boolean(clientKey),
      hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
      tossSecretKeyLength: secretKey?.length ?? 0,
      tossClientKeyLength: clientKey?.length ?? 0,
      supabaseServiceRoleKeyLength: serviceRoleKey?.length ?? 0,
      tossSecretKeyMode: secretKeyMode,
      tossClientKeyMode: clientKeyMode,
    });

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          step: 'env',
          message: 'Server is missing TOSS_SECRET_KEY',
          details: { hasTossSecretKey: false },
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          step: 'env',
          message: 'Server is missing SUPABASE_SERVICE_ROLE_KEY',
          details: { hasSupabaseServiceRoleKey: false },
        },
        { status: 500 }
      );
    }

    if (secretKey === 'your_secret_key' || serviceRoleKey === 'your_service_role_key') {
      return NextResponse.json(
        {
          ok: false,
          step: 'env',
          message: 'Server env keys are still placeholders',
          details: {
            tossSecretKey: secretKey,
            supabaseServiceRoleKey: serviceRoleKey,
            hint: 'Set real TOSS_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart server.',
          },
        },
        { status: 500 }
      );
    }

    if (secretKeyMode === 'unknown') {
      return NextResponse.json(
        {
          ok: false,
          step: 'env',
          message: 'Unrecognized TOSS_SECRET_KEY mode',
          details: {
            hint: 'Use test_sk... for test mode or live_sk... for live mode.',
          },
        },
        { status: 500 }
      );
    }

    if (clientKey && clientKeyMode !== 'unknown' && secretKeyMode !== clientKeyMode) {
      return NextResponse.json(
        {
          ok: false,
          step: 'env',
          message: 'Toss key mode mismatch (do not mix test/live keys)',
          details: {
            tossSecretKeyMode: secretKeyMode,
            tossClientKeyMode: clientKeyMode,
            hint: 'Set NEXT_PUBLIC_TOSS_CLIENT_KEY and TOSS_SECRET_KEY to the same mode.',
          },
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ConfirmRequestBody;
    const paymentKey = body.paymentKey?.trim();
    const orderId = body.orderId?.trim();
    const amount = Number(body.amount);
    const order = body.order;

    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Invalid payment confirmation payload',
          details: { paymentKey, orderId, amount },
        },
        { status: 400 }
      );
    }

    const supabaseServer = await getSupabaseServerClient();
    const { data: userData, error: userError } = await supabaseServer.auth.getUser();
    if (userError) {
      console.error('[PAYMENT_CONFIRM_USER_LOOKUP_ERROR]', userError);
    }
    const user = userData?.user ?? null;

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          step: 'payload',
          message: 'Missing order payload',
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const customerName = order.customer_name?.trim() ?? '';
    const customerPhone = order.customer_phone?.trim() ?? '';
    const confirmationChannelRaw = order.confirmation_channel ?? order.receipt_channel;
    const confirmationChannel = confirmationChannelRaw === 'sms' ? 'sms' : 'kakao';
    const checkoutEmail = order.customer_email?.trim() || null;
    const businessNameTrimmed = order.business_name?.trim() ?? '';
    const businessName = businessNameTrimmed.length > 0 ? businessNameTrimmed : null;
    let profileEmail: string | null = null;
    if (user?.id) {
      const { data: profileRow, error: profileEmailError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();
      if (profileEmailError) {
        console.error('[PAYMENT_CONFIRM_PROFILE_EMAIL_LOOKUP_ERROR]', profileEmailError);
      } else {
        profileEmail = profileRow?.email?.trim() || null;
      }
    }
    // email 우선순위: 회원(session/profile) > 비회원(checkout 입력값) > null
    const customerEmail = user ? profileEmail || user.email?.trim() || null : checkoutEmail;

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Missing guest customer info',
          details: { hasCustomerName: Boolean(customerName), hasCustomerPhone: Boolean(customerPhone) },
        },
        { status: 400 }
      );
    }

    console.log('[STEP 2] toss confirm 요청', {
      paymentKey,
      orderId,
      amount,
      userId: user?.id ?? null,
      email: user?.email ?? customerEmail ?? null,
    });

    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
      cache: 'no-store',
    });

    const tossData = (await tossResponse.json()) as {
      status?: string;
      totalAmount?: number;
      orderId?: string;
      message?: string;
      code?: string;
      paymentKey?: string;
    };

    console.log('[STEP 3] toss 응답', {
      ok: tossResponse.ok,
      status: tossResponse.status,
      code: tossData?.code ?? null,
      message: tossData?.message ?? null,
      orderId: tossData?.orderId ?? null,
      totalAmount: tossData?.totalAmount ?? null,
      paymentKey: tossData?.paymentKey ?? null,
      tossData,
    });

    if (!tossResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: tossData?.message ?? 'Toss payment confirm failed',
          details: {
            status: tossResponse.status,
            code: tossData?.code ?? null,
            toss: tossData,
          },
        },
        { status: 400 }
      );
    }

    if (Number(tossData.totalAmount) !== amount) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Confirmed amount mismatch',
          details: { confirmedTotalAmount: tossData.totalAmount, requestedAmount: amount, toss: tossData },
        },
        { status: 400 }
      );
    }

    if ((tossData.orderId ?? '') !== orderId) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Confirmed orderId mismatch',
          details: { requested: orderId, confirmed: tossData.orderId ?? null, toss: tossData },
        },
        { status: 400 }
      );
    }

    if ((tossData.paymentKey ?? '') !== paymentKey) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Confirmed paymentKey mismatch',
          details: { requested: paymentKey, confirmed: tossData.paymentKey ?? null, toss: tossData },
        },
        { status: 400 }
      );
    }

    const clientDeclaredAmount = Number(order.amount ?? order.price);
    if (!Number.isFinite(clientDeclaredAmount) || clientDeclaredAmount !== amount) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Client order amount mismatch',
          details: { orderAmount: order.amount, orderPrice: order.price, amount, toss: tossData },
        },
        { status: 400 }
      );
    }

    // Idempotency #1: payment_key
    const { data: existingByPaymentKey, error: existingByPaymentKeyError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (existingByPaymentKeyError) {
      console.error('[ORDERS_LOOKUP_FAILED_PAYMENT_KEY]', existingByPaymentKeyError);
      console.log('[STEP 4] existing payment_key lookup 실패', existingByPaymentKeyError);
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Failed to check existing payment by payment_key',
          details: { existingByPaymentKeyError, paymentKey },
        },
        { status: 500 }
      );
    }

    // Idempotency #2: order_id
    const { data: existingByOrderId, error: existingByOrderIdError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingByOrderIdError) {
      console.error('[ORDERS_LOOKUP_FAILED_ORDER_ID]', existingByOrderIdError);
      console.log('[STEP 4] existing order_id lookup 실패', existingByOrderIdError);
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Failed to check existing payment by order_id',
          details: { existingByOrderIdError, orderId },
        },
        { status: 500 }
      );
    }

    const normalizeExistingAmountPrice = async (existing: OrderRowLike | null) => {
      if (!existing) return existing;
      const existingAmount = Number(existing.amount);
      const existingPrice = Number(existing.price);
      const fallbackAmount = Number(order.amount ?? order.price ?? amount);
      const resolvedAmount =
        Number.isFinite(existingAmount) && existingAmount > 0
          ? existingAmount
          : Number.isFinite(fallbackAmount) && fallbackAmount > 0
            ? fallbackAmount
            : null;

      const needAmountPatch = resolvedAmount != null && (!Number.isFinite(existingAmount) || existingAmount <= 0);
      const needPricePatch =
        resolvedAmount != null &&
        (!Number.isFinite(existingPrice) || existingPrice <= 0 || existingPrice !== resolvedAmount);
      if (!needAmountPatch && !needPricePatch) return existing;

      const patchPayload: { amount?: number; price?: number } = {};
      if (resolvedAmount != null) {
        patchPayload.amount = resolvedAmount;
        patchPayload.price = resolvedAmount;
      }

      const { data: patched, error: patchError } = await supabaseAdmin
        .from('orders')
        .update(patchPayload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (patchError) {
        console.error('[ORDERS_PATCH_AMOUNT_PRICE_FAILED]', patchError, {
          order_id: existing.id,
          patchPayload,
        });
        return existing;
      }
      return patched;
    };

    const existingOrder = await normalizeExistingAmountPrice(
      (existingByPaymentKey ?? existingByOrderId ?? null) as OrderRowLike | null
    );
    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        order: existingOrder,
        paymentMode: isTestMode ? 'test' : 'live',
        message: isTestMode ? '이미 처리된 테스트 결제입니다.' : '이미 처리된 결제입니다.',
      });
    }

    if (!order.service || !order.period) {
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Missing order metadata for persistence',
          details: { order },
        },
        { status: 400 }
      );
    }

    const paidAmount = Number(tossData.totalAmount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Invalid paid amount from Toss',
          details: { totalAmount: tossData.totalAmount },
        },
        { status: 400 }
      );
    }
    const paidAt = new Date();
    const createdAtIso = paidAt.toISOString();
    const expiresAt = getExpiresAt(order.period, paidAt);
    if (!expiresAt) {
      console.error('[ORDERS_INSERT_INVALID_PERIOD]', { period: order.period });
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Invalid period for subscription',
          details: { period: order.period },
        },
        { status: 400 }
      );
    }

    console.log('[STEP 4] DB insert 시작', {
      userId: user?.id ?? null,
      email: customerEmail,
      guest_name: customerName,
      guest_phone: customerPhone,
      business_name: businessName,
      confirmation_channel: confirmationChannel,
      service: order.service,
      period: order.period,
      amount: paidAmount,
      price: paidAmount,
      status: 'paid',
      created_at: createdAtIso,
      expires_at: expiresAt,
      order_id: orderId,
      payment_key: paymentKey,
    });
    const { data: insertedOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          user_id: user?.id ?? null,
          email: customerEmail,
          guest_name: customerName,
          guest_phone: customerPhone,
          business_name: businessName,
          confirmation_channel: confirmationChannel,
          service: order.service,
          period: order.period,
          amount: paidAmount,
          price: paidAmount,
          status: 'paid',
          created_at: createdAtIso,
          expires_at: expiresAt,
          order_id: orderId,
          payment_key: paymentKey,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('[ORDERS_INSERT_FAILED]', insertError);
      console.log('[STEP 4] DB insert 실패', insertError);
      const isDuplicate =
        insertError.code === '23505' || (insertError.message || '').toLowerCase().includes('duplicate');

      if (isDuplicate) {
        const { data: byKey, error: errKey } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('payment_key', paymentKey)
          .maybeSingle();
        if (!errKey && byKey) {
          const normalized = await normalizeExistingAmountPrice(byKey as OrderRowLike);
          return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            paymentMode: isTestMode ? 'test' : 'live',
            message: isTestMode ? '이미 처리된 테스트 결제입니다.' : '이미 처리된 결제입니다.',
            order: normalized,
          });
        }
        const { data: byOid, error: errOid } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();
        if (!errOid && byOid) {
          const normalized = await normalizeExistingAmountPrice(byOid as OrderRowLike);
          return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            paymentMode: isTestMode ? 'test' : 'live',
            message: isTestMode ? '이미 처리된 테스트 결제입니다.' : '이미 처리된 결제입니다.',
            order: normalized,
          });
        }
      }

      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'DB insert failed',
          details: {
            insertError,
            toss: tossData,
          },
        },
        { status: 500 }
      );
    }

    console.log('[STEP 4] DB insert 성공', insertedOrder);

    // TODO(receipt-provider): Solapi/알림톡 연동 시점에 insertedOrder.confirmation_channel 값을 기준으로
    // 문자 또는 카카오 확인서 발송 큐를 연결하세요.

    return NextResponse.json({
      ok: true,
      order: insertedOrder,
      paymentMode: isTestMode ? 'test' : 'live',
      summary: {
        service: order.service,
        amount: paidAmount,
        price: paidAmount,
      },
      paymentStatus: isTestMode
        ? `TEST_${(tossData.status ?? 'DONE').toUpperCase()}`
        : tossData.status ?? null,
      message: isTestMode ? '테스트 결제 완료로 저장되었습니다.' : '결제가 정상 저장되었습니다.',
    });
  } catch (error) {
    console.error('[PAYMENT_CONFIRM_FATAL]', error);
    console.log('[PAYMENT_CONFIRM_FATAL]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        step: 'db',
        message,
        details: error,
      },
      { status: 500 }
    );
  }
}
