import { NextResponse } from 'next/server';
import { SUBSCRIBER_SELECT, SUBSCRIBERS_TABLE } from '@/lib/admin/subscribers-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import {
  SUBSCRIBER_PAYMENT_CHANNELS,
  SUBSCRIBER_SERVICE_STATUSES,
} from '@/lib/subscriber/subscriber-constants';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type PatchBody = {
  service_status?: unknown;
  admin_memo?: unknown;
  product_name?: unknown;
  payment_method?: unknown;
  payment_amount?: unknown;
  paid_at?: unknown;
  service_start_date?: unknown;
  service_end_date?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const VALID_CHANNELS = new Set(SUBSCRIBER_PAYMENT_CHANNELS.map((item) => item.value));

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.service_status !== undefined) {
    const status = str(body.service_status);
    if (!SUBSCRIBER_SERVICE_STATUSES.includes(status as (typeof SUBSCRIBER_SERVICE_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: '서비스 상태 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.service_status = status;
  }
  if (body.admin_memo !== undefined) updates.admin_memo = str(body.admin_memo);
  if (body.product_name !== undefined) updates.product_name = str(body.product_name);
  if (body.payment_method !== undefined) {
    const channel = str(body.payment_method);
    if (!VALID_CHANNELS.has(channel as (typeof SUBSCRIBER_PAYMENT_CHANNELS)[number]['value'])) {
      return NextResponse.json({ success: false, message: '결제수단 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.payment_method = channel;
  }
  if (body.payment_amount !== undefined && typeof body.payment_amount === 'number') {
    updates.payment_amount = body.payment_amount;
  }
  if (body.paid_at !== undefined) updates.paid_at = str(body.paid_at) || null;
  if (body.service_start_date !== undefined) updates.service_start_date = str(body.service_start_date) || null;
  if (body.service_end_date !== undefined) updates.service_end_date = str(body.service_end_date) || null;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, message: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(SUBSCRIBERS_TABLE)
      .update(updates)
      .eq('id', id)
      .select(SUBSCRIBER_SELECT)
      .maybeSingle();

    if (error) {
      console.error('[admin/subscribers/:id] update failed', { id, error });
      return NextResponse.json({ success: false, message: '가입자 정보 저장에 실패했습니다.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ success: false, message: '가입자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subscriber: data });
  } catch (error) {
    console.error('[admin/subscribers/:id] PATCH threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
