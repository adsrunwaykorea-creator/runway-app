import { NextResponse } from 'next/server';
import { enrichPaymentsWithConsultationMessages } from '@/lib/admin/payment-history-enrich';
import {
  PAYMENT_HISTORY_LEGACY_SELECT,
  PAYMENT_HISTORY_SELECT,
} from '@/lib/admin/payment-history-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { syncPaidConsultationLeadsToHistory } from '@/lib/payment/complete-lead-payment';
import { isMissingColumnError, isMissingTableError } from '@/lib/payment/payment-schema';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { PaymentHistoryRow } from '@/types/payment-history';
export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    let migrationRequired = false;

    await syncPaidConsultationLeadsToHistory(supabase);

    const modernResult = await supabase
      .from('payment_history')
      .select(PAYMENT_HISTORY_SELECT)
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false });

    let data: PaymentHistoryRow[] | null = (modernResult.data as PaymentHistoryRow[] | null) ?? null;
    let error = modernResult.error;

    if (error && isMissingColumnError(error, 'management_status')) {
      console.warn('[admin/payment-history] legacy schema — run 022_payment_management_fields.sql');
      migrationRequired = true;
      const legacyResult = await supabase
        .from('payment_history')
        .select(PAYMENT_HISTORY_LEGACY_SELECT)
        .eq('payment_status', 'paid')
        .order('paid_at', { ascending: false });
      data = (legacyResult.data as PaymentHistoryRow[] | null) ?? null;
      error = legacyResult.error;
    }

    if (error) {
      const tableMissing = isMissingTableError(error, 'payment_history');

      if (tableMissing) {
        console.warn('[admin/payment-history] table missing — run 019_payment_history_and_kakao_fields.sql');
        return NextResponse.json({ success: true, payments: [], migrationRequired: true });
      }

      console.error('[admin/payment-history] list failed', error);
      return NextResponse.json(
        { success: false, message: '결제 완료 고객 목록을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    const enriched = await enrichPaymentsWithConsultationMessages(supabase, data ?? []);

    return NextResponse.json({ success: true, payments: enriched, migrationRequired });
  } catch (error) {
    console.error('[admin/payment-history] GET threw', error);
    return NextResponse.json(
      { success: false, message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    );
  }
}
