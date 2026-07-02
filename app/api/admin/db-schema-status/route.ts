import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { checkPaymentSchema } from '@/lib/payment/check-payment-schema';
import { PAYMENT_MIGRATION_019_FILE } from '@/lib/payment/payment-schema';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    const status = await checkPaymentSchema(supabase);

    console.log('[admin/db-schema-status]', status);

    return NextResponse.json({
      success: true,
      ...status,
      migrationFile: PAYMENT_MIGRATION_019_FILE,
    });
  } catch (error) {
    console.error('[admin/db-schema-status] check failed', error);
    return NextResponse.json(
      { success: false, message: 'DB 스키마 확인에 실패했습니다.' },
      { status: 500 },
    );
  }
}
