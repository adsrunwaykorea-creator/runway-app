import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

const PAYMENT_REQUEST_SELECT =
  'id, created_at, product_id, product_name, amount, vat_included, service_period_days, customer_name, customer_phone, customer_email, business_name, business_type, message, payment_method, status, privacy_agreed, terms_agreed';

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUEST_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/payment-requests] list failed', error);
      return NextResponse.json(
        { success: false, message: '결제 신청 내역을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, requests: data ?? [] });
  } catch (error) {
    console.error('[admin/payment-requests] GET threw', error);
    return NextResponse.json(
      { success: false, message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    );
  }
}
