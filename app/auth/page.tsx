'use client';

import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const handleKakaoLogin = async () => {
    const supabase = getSupabaseBrowserClient();

    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100">
      <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-bold tracking-wide text-zinc-900">
            RUNWAY
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">
              MAIN
            </Link>
            <Link href="/signup" className="text-zinc-600 hover:text-zinc-900">
              회원가입
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          <h1 className="mb-2 text-[1.8rem] font-extrabold text-slate-900">로그인</h1>
          <p className="mb-6 text-sm text-zinc-600">카카오 계정으로 간편하게 로그인하세요.</p>

          <button
            type="button"
            onClick={handleKakaoLogin}
            className="h-11 w-full rounded-[10px] border border-[#f1d900] bg-[#fee500] text-[0.92rem] font-bold text-[#181600] transition hover:brightness-95"
          >
            카카오 로그인
          </button>

          <div className="mt-4 text-center text-sm text-zinc-600">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-semibold text-zinc-900 hover:underline">
              회원가입
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}