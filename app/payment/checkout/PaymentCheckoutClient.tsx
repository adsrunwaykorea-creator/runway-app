'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        params: {
          amount: number;
          orderId: string;
          orderName: string;
          customerEmail?: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void>;
    };
  }
}

const TOSS_SCRIPT_URL = 'https://js.tosspayments.com/v1/payment';

function loadTossScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.TossPayments) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TOSS_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('토스 스크립트 로드 실패')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = TOSS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('토스 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

const LOGIN_NEXT_PATH = '/payment/checkout';

export default function PaymentCheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('결제하기 버튼을 눌러 결제를 진행해주세요.');
  const [loading, setLoading] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [paymentContext, setPaymentContext] = useState<{
    service: string;
    serviceKey: string;
    period: string;
    price: number;
    userId: string;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeCheckout = async () => {
      const service = searchParams.get('service') ?? '';
      const serviceKey = searchParams.get('service_key') ?? '';
      const period = searchParams.get('period') ?? '';
      const price = Number(searchParams.get('price') ?? '0');
      if (!service || !serviceKey || !period || !price) {
        if (!cancelled) {
          setParamsError('결제 정보가 올바르지 않습니다. 다시 시도해주세요.');
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error('auth check error', error);
      }

      if (!data.session) {
        const qs = searchParams.toString();
        const nextUrl = qs ? `${LOGIN_NEXT_PATH}?${qs}` : LOGIN_NEXT_PATH;
        router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
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
        const qs = searchParams.toString();
        const mypageNext = qs ? `${LOGIN_NEXT_PATH}?${qs}` : LOGIN_NEXT_PATH;
        router.replace(`/mypage?next=${encodeURIComponent(mypageNext)}`);
        return;
      }

      const name = profileRow?.name?.trim() ?? '';
      const phone = profileRow?.phone?.trim() ?? '';
      if (!name || !phone) {
        const qs = searchParams.toString();
        const mypageNext = qs ? `${LOGIN_NEXT_PATH}?${qs}` : LOGIN_NEXT_PATH;
        router.replace(`/mypage?next=${encodeURIComponent(mypageNext)}`);
        return;
      }

      const user = data.session.user;
      setPaymentContext({
        service,
        serviceKey,
        period,
        price,
        userId: user.id,
        email: user.email ?? null,
      });
      setCheckoutReady(true);
      setMessage('결제하기 버튼을 눌러 결제를 진행해주세요.');
    };

    void initializeCheckout();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleStartPayment = async () => {
    if (!paymentContext || loading) return;
    setLoading(true);
    try {
      await loadTossScript();
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey || !window.TossPayments) {
        setMessage('토스 결제 키가 설정되지 않았습니다.');
        return;
      }

      const orderId = `rw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const pendingOrder = {
        service: paymentContext.service,
        service_key: paymentContext.serviceKey,
        period: paymentContext.period,
        price: paymentContext.price,
        user_id: paymentContext.userId,
        email: paymentContext.email,
        status: 'paid',
      };
      window.localStorage.setItem(`runway_order_${orderId}`, JSON.stringify(pendingOrder));

      setMessage('토스 결제창으로 이동합니다...');
      const tossPayments = window.TossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: paymentContext.price,
        orderId,
        orderName: `${paymentContext.service} / ${paymentContext.period}`,
        customerEmail: paymentContext.email ?? undefined,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (checkoutError) {
      console.log('[CHECKOUT_ERROR]', checkoutError);
      const detail =
        checkoutError instanceof Error ? checkoutError.message : '알 수 없는 오류';
      setMessage(`결제창 호출 중 오류가 발생했습니다. (${detail})`);
    } finally {
      setLoading(false);
    }
  };

  if (paramsError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h1 className="mb-2 text-xl font-bold text-slate-900">결제 진행</h1>
          <p className="text-sm text-zinc-600">{paramsError}</p>
        </section>
      </main>
    );
  }

  if (!checkoutReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100">
        <p className="text-zinc-600">로그인 상태 확인 중...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제 진행</h1>
        <p className="mb-4 text-sm text-zinc-600">{message}</p>
        <button
          type="button"
          onClick={() => void handleStartPayment()}
          disabled={!checkoutReady || loading}
          className="h-11 w-full rounded-[10px] bg-slate-900 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '결제창 여는 중...' : '결제하기'}
        </button>
      </section>
    </main>
  );
}
