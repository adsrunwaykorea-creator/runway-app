'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ConfirmViewState = 'idle' | 'loading' | 'success' | 'error';
type ConfirmApiResponse = {
  ok?: boolean;
  alreadyProcessed?: boolean;
  message?: string;
  paymentStatus?: string | null;
  summary?: {
    service?: string;
    price?: number;
  };
  order?: {
    service?: string;
    price?: number;
    status?: string;
  } | null;
};

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<ConfirmViewState>('idle');
  const [message, setMessage] = useState('결제 완료 정보를 확인 중입니다...');
  const [isAlreadyProcessed, setIsAlreadyProcessed] = useState(false);
  const [serviceName, setServiceName] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>('paid');
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const persistOrder = async () => {
      setViewState('loading');
      const params = new URLSearchParams(window.location.search);
      const paymentKey = params.get('paymentKey');
      const orderId = params.get('orderId');
      const amount = Number(params.get('amount') ?? '0');

      if (!orderId) {
        setMessage('주문 정보를 찾을 수 없습니다.');
        setViewState('error');
        return;
      }
      if (!paymentKey || !Number.isFinite(amount) || amount <= 0) {
        setMessage('결제 검증 정보가 올바르지 않습니다.');
        setViewState('error');
        return;
      }

      const sessionConfirmKey = `confirm:${paymentKey}`;
      const sessionConfirmDataKey = `confirm-data:${paymentKey}`;
      const alreadyConfirmed = window.sessionStorage.getItem(sessionConfirmKey) === 'done';
      const cachedResultRaw = window.sessionStorage.getItem(sessionConfirmDataKey);

      if (alreadyConfirmed && cachedResultRaw) {
        try {
          const cached = JSON.parse(cachedResultRaw) as ConfirmApiResponse;
          const cachedService =
            cached.summary?.service ?? cached.order?.service ?? '선택 상품';
          const cachedPrice = Number(cached.summary?.price ?? cached.order?.price ?? amount);
          const cachedStatus = cached.paymentStatus ?? cached.order?.status ?? 'paid';
          setServiceName(cachedService);
          setPrice(Number.isFinite(cachedPrice) ? cachedPrice : amount);
          setPaymentStatus(cachedStatus);
        } catch {
          setServiceName('선택 상품');
          setPrice(amount);
          setPaymentStatus('paid');
        }
        setIsAlreadyProcessed(true);
        setMessage('이미 확인된 결제입니다. 아래 내용으로 정상 접수되었습니다.');
        setViewState('success');
        return;
      }

      const raw = window.localStorage.getItem(`runway_order_${orderId}`);
      if (!raw) {
        setMessage('임시 주문 정보가 없습니다. 다시 시도해주세요.');
        setViewState('error');
        return;
      }

      const pendingOrder = JSON.parse(raw) as {
        service?: string;
        service_key?: string;
        period?: string;
        price?: number;
      };

      try {
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
            order: {
              service: pendingOrder.service,
              service_key: pendingOrder.service_key,
              period: pendingOrder.period,
              price: pendingOrder.price,
            },
          }),
        });

        const result = (await response.json()) as ConfirmApiResponse;
        if (!response.ok || !result.ok) {
          console.log('[PAYMENT_CONFIRM_ERROR]', result);
          setMessage(result.message || '결제 저장 중 오류가 발생했습니다.');
          setViewState('error');
          return;
        }

        const resolvedService =
          result.summary?.service ?? result.order?.service ?? pendingOrder.service ?? '선택 상품';
        const resolvedPrice = Number(result.summary?.price ?? result.order?.price ?? amount);
        const resolvedStatus = result.paymentStatus ?? result.order?.status ?? 'paid';

        setServiceName(resolvedService);
        setPrice(Number.isFinite(resolvedPrice) ? resolvedPrice : amount);
        setPaymentStatus(resolvedStatus);

        window.sessionStorage.setItem(sessionConfirmKey, 'done');
        window.sessionStorage.setItem(sessionConfirmDataKey, JSON.stringify(result));
        window.localStorage.removeItem(`runway_order_${orderId}`);

        if (result.alreadyProcessed) {
          setIsAlreadyProcessed(true);
          setMessage('이미 확인된 결제입니다. 아래 내용으로 정상 접수되었습니다.');
        } else {
          setIsAlreadyProcessed(false);
          setMessage('서비스 준비가 시작되었습니다. 진행 상태는 마이페이지에서 확인하실 수 있습니다.');
        }
        setViewState('success');
      } catch (error) {
        console.log('[PAYMENT_CONFIRM_FATAL]', error);
        setMessage('결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setViewState('error');
      }
    };

    void persistOrder();
  }, []);

  const formattedPrice = Number.isFinite(price) ? `₩${price.toLocaleString('ko-KR')}` : '-';

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제가 완료되었습니다</h1>
        <p className="mb-4 text-sm text-zinc-600">{message}</p>

        {viewState === 'loading' || viewState === 'idle' ? (
          <p className="text-sm text-zinc-500">결제 내역을 안전하게 확인하고 있습니다...</p>
        ) : null}

        {viewState === 'success' ? (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p>
              <span className="font-semibold">서비스</span>: {serviceName || '선택 상품'}
            </p>
            <p>
              <span className="font-semibold">결제 금액</span>: {formattedPrice}
            </p>
            <p>
              <span className="font-semibold">결제 상태</span>: {paymentStatus}
            </p>
            {isAlreadyProcessed ? (
              <p className="pt-1 text-xs font-semibold text-emerald-700">
                동일 결제가 다시 접수되지 않도록 안전하게 처리되었습니다.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {viewState === 'success' ? (
            <button
              type="button"
              onClick={() => router.replace('/mypage')}
              className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              마이페이지로 이동
            </button>
            
          ) : null}

          {viewState === 'success' ? (
            <Link
              href="/"
              className="flex h-11 w-full items-center justify-center rounded-[10px] border border-zinc-300 bg-white text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
            >
              홈으로 이동
            </Link>
          ) : null}

          {viewState === 'error' ? (
            <>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex h-11 w-full items-center justify-center rounded-[10px] border border-zinc-300 bg-white text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
              >
                다시 시도
              </button>
              <Link
                href="/mypage"
                className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                마이페이지로 이동
              </Link>
            </>
          ) : null}

          {viewState !== 'success' && viewState !== 'error' ? (
            <Link
              href="/mypage"
              className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              마이페이지로 이동
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
