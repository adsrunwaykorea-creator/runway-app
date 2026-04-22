'use client';

import Link from 'next/link';

export default function PaymentFailPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const reason = params?.get('message') ?? '결제 정보 확인 과정에서 일시적인 문제가 발생했습니다.';
  const code = params?.get('code');

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        {/* DEV NOTE: 실제 운영 전 테스트 중인 결제 흐름 */}
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제 확인 중 문제가 발생했습니다</h1>
        <p className="mb-2 text-sm text-zinc-600">{reason}</p>
        <p className="mb-4 text-sm text-zinc-600">
          잠시 후 다시 시도하시거나 상담 채널로 문의해주세요.
        </p>
        {code ? <p className="mb-4 text-xs text-red-600">오류 코드: {code}</p> : null}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 w-full items-center justify-center rounded-[10px] border border-zinc-300 bg-white text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
          >
            다시 확인하기
          </button>
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
