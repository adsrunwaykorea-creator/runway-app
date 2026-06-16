import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type AdminAuthResult =
  | { userId: string; error?: undefined }
  | { userId?: undefined; error: NextResponse };

export async function requireAdminUser(): Promise<AdminAuthResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[requireAdminUser] profile load failed', profileError);
    return {
      error: NextResponse.json({ success: false, message: '권한 확인에 실패했습니다.' }, { status: 500 }),
    };
  }

  const role = (profile?.role ?? '').toString().toLowerCase();
  if (role !== 'admin' && role !== 'manager') {
    return {
      error: NextResponse.json({ success: false, message: '관리자 권한이 없습니다.' }, { status: 403 }),
    };
  }

  return { userId: user.id };
}
