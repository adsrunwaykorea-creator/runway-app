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

type ViewState = 'loading' | 'success' | 'error';

export default function CheckoutSuccessClient() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [message, setMessage] = useState('카카오페이 결제를 확인하는 중입니다...');
  const [summary, setSummary] = useState<CheckoutCompleteSummary | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pgToken = params.get('pg_token');
    const partnerOrderId = params.get('partner_order_id');

    if (!pgToken) {
      const cached = sessionStorage.getItem(CHECKOUT_COMPLETE_STORAGE_KEY);
      if (cached) {
        try {
          setSummary(JSON.parse(cached) as CheckoutCompleteSummary);
          setViewState('success');
          return;
        } catch {
          sessionStorage.removeItem(CHECKOUT_COMPLETE_STORAGE_KEY);
        }
      }
      setMessage('결제 승인 정보(pg_token)가 없습니다.');
      setViewState('error');
      return;
    }

    if (!partnerOrderId) {
      setMessage('주문 정보(partner_order_id)가 없습니다.');
      setViewState('error');
      return;
    }

    let cancelled = false;

    const approve = async () => {
      try {
        console.log('[checkout/success] POST /api/checkout/kakao-pay-approve', { partnerOrderId });
        const response = await fetch('/api/checkout/kakao-pay-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgToken, partnerOrderId }),
        });
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.message ?? '결제 승인에 실패했습니다.');
        }

        const nextSummary: CheckoutCompleteSummary = {
          name: result.summary?.name ?? '-',
          productName: result.summary?.productName ?? '-',
          amount: result.summary?.amount ?? 0,
          createdAt: result.summary?.paidAt ?? new Date().toISOString(),
        };

        if (!cancelled) {
          sessionStorage.setItem(CHECKOUT_COMPLETE_STORAGE_KEY, JSON.stringify(nextSummary));
          setSummary(nextSummary);
          setViewState('success');
        }
      } catch (error) {
        console.error('[checkout/success] approve failed', error);
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : '결제 승인에 실패했습니다.');
          setViewState('error');
        }
      }
    };

    void approve();
    return () => {
      cancelled = true;
    };
  }, []);

  if (viewState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-10">
        <p className="text-sm text-zinc-600">{message}</p>
      </main>
    );
  }

  if (viewState === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-700">결제 확인 실패</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-700">{message}</p>
          <Link
            href="/checkout"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-zinc-900 px-5 text-sm font-semibold text-white"
          >
            결제 페이지로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">카카오페이 결제 완료</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-700">
            결제가 정상적으로 완료되었습니다. 담당자가 확인 후 서비스 안내를 드리겠습니다.
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
              <dt className="font-semibold text-zinc-600">결제 완료 일시</dt>
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
        </div>
      </section>
    </main>
  );
}
