import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ProfileShape = {
  name: string | null;
  phone: string | null;
};

function sanitizeNextPath(path: string | null | undefined) {
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  return path;
}

export async function requireProfileComplete(
  nextPath = '/payment'
): Promise<{ user: User; profile: ProfileShape }> {
  const supabase = await getSupabaseServerClient();
  const safeNext = sanitizeNextPath(nextPath);
  const loginPath = safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login';
  const mypagePath = safeNext ? `/mypage?next=${encodeURIComponent(safeNext)}` : '/mypage';

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect(loginPath);
  }

  const user = userData.user;
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    redirect(mypagePath);
  }

  const name = profileRow?.name?.trim() ?? '';
  const phone = profileRow?.phone?.trim() ?? '';

  if (!name || !phone) {
    redirect(mypagePath);
  }

  return {
    user,
    profile: {
      name: profileRow?.name ?? null,
      phone: profileRow?.phone ?? null,
    },
  };
}
