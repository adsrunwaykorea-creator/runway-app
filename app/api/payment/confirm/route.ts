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
    price?: number;
  };
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

export async function POST(request: Request) {
  try {
    const secretKey = process.env.TOSS_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[STEP 1] env 확인 시작');
    console.log('[ENV_VALUES]', {
      hasTossSecretKey: Boolean(secretKey),
      hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
      tossSecretKeyLength: secretKey?.length ?? 0,
      supabaseServiceRoleKeyLength: serviceRoleKey?.length ?? 0,
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

    if (
      !order?.service ||
      !order?.service_key ||
      !order?.period ||
      !Number.isFinite(Number(order?.price))
    ) {
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

    const supabaseServer = await getSupabaseServerClient();
    const { data: userData, error: userError } = await supabaseServer.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Unauthorized',
          details: { userError, hasUser: Boolean(userData?.user) },
        },
        { status: 401 }
      );
    }

    console.log('[STEP 2] toss confirm 요청', {
      paymentKey,
      orderId,
      amount,
      userId: userData.user.id,
      email: userData.user.email ?? null,
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

    if (Number(order.price) !== amount) {
      return NextResponse.json(
        {
          ok: false,
          step: 'toss',
          message: 'Client order amount mismatch',
          details: { orderPrice: order.price, amount, toss: tossData },
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (existingOrderError) {
      console.error('[ORDERS_LOOKUP_FAILED]', existingOrderError);
      console.log('[STEP 4] existing payment lookup 실패', existingOrderError);
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          message: 'Failed to check existing payment',
          details: { existingOrderError, paymentKey },
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        order: existingOrder,
        message: '이미 처리된 결제입니다.',
      });
    }

    const paidAmount = Number(tossData.totalAmount);
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
      userId: userData.user.id,
      email: userData.user.email ?? null,
      service: order.service,
      service_key: order.service_key,
      period: order.period,
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
          user_id: userData.user.id,
          email: userData.user.email ?? null,
          service: order.service,
          service_key: order.service_key,
          period: order.period,
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
        const { data: duplicatedOrder, error: duplicatedOrderError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('payment_key', paymentKey)
          .maybeSingle();

        if (!duplicatedOrderError && duplicatedOrder) {
          return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            message: '이미 처리된 결제입니다.',
            order: duplicatedOrder,
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

    return NextResponse.json({
      ok: true,
      order: insertedOrder,
      summary: {
        service: order.service,
        price: paidAmount,
      },
      paymentStatus: tossData.status ?? null,
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
