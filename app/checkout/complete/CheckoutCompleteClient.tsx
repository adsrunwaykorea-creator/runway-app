'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CHECKOUT_COMPLETE_STORAGE_KEY, type CheckoutCompleteSummary } from '@/types/payment-request';

function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CheckoutCompleteClient() {
  const [summary, setSummary] = useState<CheckoutCompleteSummary | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(CHECKOUT_COMPLETE_STORAGE_KEY);
    if (!raw) return;
    try {
      setSummary(JSON.parse(raw) as CheckoutCompleteSummary);
    } catch {
      sessionStorage.removeItem(CHECKOUT_COMPLETE_STORAGE_KEY);
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">결제 신청 접수 완료</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-700">
            결제 요청이 접수되었습니다. 담당자가 확인 후 결제 안내를 드리겠습니다.
          </p>
        </div>

        {summary ? (
          <dl className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="font-semibold text-zinc-600">신청자 이름</dt>
              <dd className="font-medium text-slate-900">{summary.name}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="font-semibold text-zinc-600">선택 상품명</dt>
              <dd className="font-medium text-slate-900">{summary.productName}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="font-semibold text-zinc-600">결제 금액</dt>
              <dd className="font-extrabold text-blue-700">{formatPrice(summary.amount)}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="font-semibold text-zinc-600">접수 일시</dt>
              <dd className="font-medium text-slate-900">{formatDateTime(summary.createdAt)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-zinc-900 px-5 text-sm font-semibold text-white"
          >
            홈으로
          </Link>
          <Link
            href="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-zinc-300 bg-white px-5 text-sm font-semibold text-slate-800"
          >
            결제 신청 페이지
          </Link>
        </div>
      </section>
    </main>
  );
}
