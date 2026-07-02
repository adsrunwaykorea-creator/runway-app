import { NextResponse } from 'next/server';
import {
  isPaymentRequestsSchemaOutdated,
  PAYMENT_REQUEST_LEGACY_SELECT,
  PAYMENT_REQUEST_SELECT,
} from '@/lib/admin/payment-requests-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

const COMPLETED_STATUSES = ['결제완료', '취소', '환불'];

function isPendingRequest(row: { status?: string | null; payment_status?: string | null }) {
  if (row.payment_status === 'paid') return false;
  if (row.status && COMPLETED_STATUSES.includes(row.status)) return false;
  return true;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    let migrationRequired = false;

    const modernResult = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUEST_SELECT)
      .order('created_at', { ascending: false });

    let data: unknown[] | null = modernResult.data;
    let error = modernResult.error;

    if (error && isPaymentRequestsSchemaOutdated(error, 'payment_status')) {
      console.warn('[admin/payment-requests] legacy schema — run 019/022 SQL');
      migrationRequired = true;
      const legacyResult = await supabase
        .from('payment_requests')
        .select(PAYMENT_REQUEST_LEGACY_SELECT)
        .order('created_at', { ascending: false });
      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      console.error('[admin/payment-requests] list failed', error);
      return NextResponse.json(
        { success: false, message: '결제 요청 내역을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    const requests = ((data ?? []) as Array<{ status?: string; payment_status?: string }>).filter(
      isPendingRequest,
    );

    return NextResponse.json({ success: true, requests, migrationRequired });
  } catch (error) {
    console.error('[admin/payment-requests] GET threw', error);
    return NextResponse.json(
      { success: false, message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    );
  }
}
