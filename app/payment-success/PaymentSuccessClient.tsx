'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const formatPrice = (value: number) => `₩${value.toLocaleString('ko-KR')}`;

export default function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = searchParams.get('service') ?? '선택한 서비스';
  const price = Number(searchParams.get('price') ?? '0');

  const priceText = useMemo(() => formatPrice(Number.isFinite(price) ? price : 0), [price]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/mypage');
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제가 완료되었습니다</h1>
        <p className="mb-4 text-sm text-zinc-600">잠시 후 마이페이지로 자동 이동합니다.</p>

        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold text-zinc-500">결제 요약</p>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-semibold">서비스</span>: {service}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">금액</span>: {priceText}
          </p>
        </div>

        <Link
          href="/mypage"
          className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          마이페이지로 이동
        </Link>
      </section>
    </main>
  );
}
