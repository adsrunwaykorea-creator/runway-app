'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NEXT_PAYMENT = '/payment';

export default function PaymentPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error('auth check error', error);
      }

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(NEXT_PAYMENT)}`);
        return;
      }

      const userId = data.session.user.id;
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error('profile check error', profileError);
        router.replace(`/mypage?next=${encodeURIComponent(NEXT_PAYMENT)}`);
        return;
      }

      const name = profileRow?.name?.trim() ?? '';
      const phone = profileRow?.phone?.trim() ?? '';
      if (!name || !phone) {
        router.replace(`/mypage?next=${encodeURIComponent(NEXT_PAYMENT)}`);
        return;
      }

      setReady(true);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100">
        <p className="text-zinc-600">로그인 상태 확인 중...</p>
      </div>
    );
  }

  const qs = searchParams.toString();
  const src = qs ? `/html/payment.html?${qs}` : '/html/payment.html';
  return <iframe src={src} className="min-h-screen w-full border-0" />;
}
