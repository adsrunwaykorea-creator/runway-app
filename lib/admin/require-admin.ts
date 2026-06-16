import { NextResponse } from 'next/server';
import {
  hasAdminAccess,
  isAdminDevBypassServer,
  parseAdminEmails,
} from '@/lib/admin/access';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type AdminAuthResult =
  | { userId: string; error?: undefined }
  | { userId?: undefined; error: NextResponse };

export async function requireAdminUser(request?: Request): Promise<AdminAuthResult> {
  if (isAdminDevBypassServer(request)) {
    console.log('[requireAdminUser] local development bypass enabled');
    return { userId: 'dev-local-bypass' };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('[requireAdminUser] redirect reason: not logged in', {
      userError: userError?.message ?? null,
    });
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

  const role = profile?.role ?? null;
  const email = user.email ?? null;
  const allowed = hasAdminAccess(role, email);

  if (!allowed) {
    console.log('[requireAdminUser] redirect reason: not admin', {
      userId: user.id,
      email,
      role,
      adminEmailsConfigured: parseAdminEmails().length > 0,
    });
    return {
      error: NextResponse.json({ success: false, message: '관리자 권한이 없습니다.' }, { status: 403 }),
    };
  }

  return { userId: user.id };
}
