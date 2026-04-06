'use client';

import Link from 'next/link';

export default function PaymentFailPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const reason = params?.get('message') ?? '결제가 취소되었거나 실패했습니다.';
  const code = params?.get('code');

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제 실패</h1>
        <p className="mb-2 text-sm text-zinc-600">{reason}</p>
        {code ? <p className="mb-4 text-xs text-red-600">오류 코드: {code}</p> : <div className="mb-4" />}
        <Link
          href="/payment"
          className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          결제 페이지로 돌아가기
        </Link>
      </section>
    </main>
  );
}
