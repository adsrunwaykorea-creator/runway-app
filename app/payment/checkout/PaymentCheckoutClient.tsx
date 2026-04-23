'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

/** Checkout·주문 표기용: 리드(구 DB) 계열 서비스명을 canonical 로 정규화 (service_key는 변경하지 않음) */
export function normalizeServiceDisplayName(service: string): string {
  const s = service.trim();
  const asLead = new Set([
    '리드 수집형 광고 운영',
    '리드 수집형 광고',
    '리드 수집 광고',
    'DB 마케팅',
    '온라인 DB 마케팅',
    '리드 광고 운영',
  ]);
  if (asLead.has(s)) return '리드 광고 운영';
  return s;
}

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

type ReceiptChannel = 'kakao' | 'sms';

export default function PaymentCheckoutClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('결제하기 버튼을 눌러 결제를 진행해주세요.');
  const [loading, setLoading] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [receiptChannel, setReceiptChannel] = useState<ReceiptChannel>('kakao');
  const [agreeProduct, setAgreeProduct] = useState(false);
  const [agreeRefundPrivacy, setAgreeRefundPrivacy] = useState(false);
  const [paymentContext, setPaymentContext] = useState<{
    service: string;
    serviceKey: string;
    period: string;
    price: number;
  } | null>(null);

  const formatPrice = (value: number) => `₩${value.toLocaleString('ko-KR')}`;
  const periodLabel = paymentContext?.period === 'monthly' ? '1개월' : '3개월';

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
      if (error) {
        console.error('auth check error', error);
      }

      const user = data.session?.user ?? null;
      if (user?.id) {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled && !profileError) {
          if (profileRow?.name) setCustomerName(profileRow.name);
          if (profileRow?.phone) setCustomerPhone(profileRow.phone);
        }
      }

      if (!cancelled) {
        setPaymentContext({
          service,
          serviceKey,
          period,
          price,
        });
        setCheckoutReady(true);
        setMessage('결제하기 버튼을 눌러 결제를 진행해주세요.');
      }
    };

    void initializeCheckout();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleStartPayment = async () => {
    if (!paymentContext || loading) return;
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    if (!trimmedName) {
      setMessage('이름을 입력해주세요.');
      return;
    }
    if (!trimmedPhone) {
      setMessage('전화번호를 입력해주세요.');
      return;
    }
    if (!agreeProduct || !agreeRefundPrivacy) {
      setMessage('필수 항목에 동의해 주신 뒤 결제를 진행해주세요.');
      return;
    }

    setLoading(true);
    try {
      await loadTossScript();
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey || !window.TossPayments) {
        setMessage('토스 결제 키가 설정되지 않았습니다.');
        return;
      }

      const orderId = `rw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const trimmedBusiness = businessName.trim();
      const orderServiceLabel =
        paymentContext.serviceKey === 'sns' ? 'SNS 마케팅' : '리드 광고 운영';
      const pendingOrder = {
        service: orderServiceLabel,
        service_key: paymentContext.serviceKey,
        period: paymentContext.period,
        amount: paymentContext.price,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        business_name: trimmedBusiness.length > 0 ? trimmedBusiness : null,
        receipt_channel: receiptChannel,
      };
      window.localStorage.setItem(`runway_order_${orderId}`, JSON.stringify(pendingOrder));

      setMessage('토스 결제창으로 이동합니다...');
      const tossPayments = window.TossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: paymentContext.price,
        orderId,
        orderName: `${orderServiceLabel} / ${paymentContext.period}`,
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
        <p className="text-zinc-600">결제 정보를 확인 중...</p>
      </div>
    );
  }

  const agreementsOk = agreeProduct && agreeRefundPrivacy;
  const payDisabled = !checkoutReady || loading || !agreementsOk;
  const checkoutServiceLine = paymentContext
    ? paymentContext.serviceKey === 'sns'
      ? 'SNS 마케팅'
      : normalizeServiceDisplayName(paymentContext.service)
    : '';

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6 pb-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="mb-2 text-xl font-bold text-slate-900">결제 진행</h1>
        <p className="mb-4 text-sm leading-relaxed text-zinc-600">
          선택한 서비스와 결제 정보를 확인한 뒤 결제를 진행해주세요.
        </p>

        {paymentContext ? (
          <>
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-900">신청 서비스</span>: {checkoutServiceLine}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">기간</span>: {periodLabel}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">금액</span>: {formatPrice(paymentContext.price)}
              </p>
              <p className="mt-2 text-xs leading-6 text-zinc-600">
                신용카드 및 간편결제는 결제창에서 확인·선택할 수 있습니다.
                <br />
                결제 완료 후 확인서는 선택하신 채널(카카오 또는 문자) 기준으로 순차 발송됩니다.
                <br />
                <Link href="/refund-policy" className="font-semibold text-zinc-800 underline underline-offset-2">
                  청약철회·환불정책 확인
                </Link>
              </p>
            </div>
            <div className="mb-4 space-y-1.5 rounded-lg border border-zinc-100 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-600">
              <p>
                본 상품은 광고 운영형 서비스이며, 제공 기간은 선택한 이용 기간 기준으로 적용됩니다.
              </p>
              <p>
                서비스 제공 전에는 전액 환불이 가능하며, 제공이 시작된 이후에는 진행된 업무를 제외한
                잔여 범위에 한해 환불이 가능합니다. 자세한 기준은 청약철회·환불정책을 참고해주세요.
              </p>
            </div>
          </>
        ) : null}

        <div className="mb-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="guest-name">
              이름
            </label>
            <input
              id="guest-name"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="홍길동"
              className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="guest-phone">
              전화번호
            </label>
            <input
              id="guest-phone"
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="010-1234-5678"
              className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="business-name">
              상호명 <span className="font-normal text-zinc-500">(선택)</span>
            </label>
            <input
              id="business-name"
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="사업자 또는 매장명"
              className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>
          <fieldset>
            <legend className="mb-1 block text-xs font-semibold text-zinc-700">확인서 수신 채널</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReceiptChannel('kakao')}
                aria-pressed={receiptChannel === 'kakao'}
                className={`flex h-11 items-center justify-center rounded-md border text-sm font-medium transition ${
                  receiptChannel === 'kakao'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 text-zinc-800'
                }`}
              >
                카카오
              </button>
              <button
                type="button"
                onClick={() => setReceiptChannel('sms')}
                aria-pressed={receiptChannel === 'sms'}
                className={`flex h-11 items-center justify-center rounded-md border text-sm font-medium transition ${
                  receiptChannel === 'sms'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 text-zinc-800'
                }`}
              >
                문자
              </button>
            </div>
          </fieldset>
        </div>

        <div className="mb-4 space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-zinc-800">
            <input
              type="checkbox"
              checked={agreeProduct}
              onChange={(e) => setAgreeProduct(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 text-zinc-900 focus:ring-zinc-500"
            />
            <span>
              <span className="font-semibold text-zinc-900">[필수]</span> 상품 정보 및 결제 내용을 확인했습니다.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-zinc-800">
            <input
              type="checkbox"
              checked={agreeRefundPrivacy}
              onChange={(e) => setAgreeRefundPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 text-zinc-900 focus:ring-zinc-500"
            />
            <span>
              <span className="font-semibold text-zinc-900">[필수]</span> 환불정책 및 개인정보 수집·이용에
              동의합니다.{' '}
              <Link href="/refund-policy" className="font-medium text-zinc-900 underline underline-offset-2">
                환불정책
              </Link>
              {' · '}
              <Link href="/#contact" className="font-medium text-zinc-900 underline underline-offset-2">
                개인정보 안내
              </Link>
            </span>
          </label>
        </div>

        <p className="mb-4 text-sm text-zinc-600">{message}</p>
        <button
          type="button"
          onClick={() => void handleStartPayment()}
          disabled={payDisabled}
          className="h-11 w-full rounded-[10px] bg-slate-900 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '결제창 여는 중...' : '결제하기'}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          결제수단은 토스 결제창에서 선택할 수 있습니다.
        </p>
      </section>

      <footer className="mx-auto mt-8 w-full max-w-md border-t border-zinc-200/80 pt-5 text-center text-[11px] leading-relaxed text-zinc-500">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link href="/refund-policy" className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline">
            청약철회·환불정책
          </Link>
          <span className="text-zinc-300" aria-hidden>
            |
          </span>
          <Link href="/#contact" className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline">
            개인정보처리방침
          </Link>
          <span className="text-zinc-300" aria-hidden>
            |
          </span>
          <Link href="/refund-policy" className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline">
            이용약관·거래조건
          </Link>
        </div>
        <p className="text-zinc-500">
          <span className="font-medium text-zinc-600">런웨이</span> 사업자등록번호 326-02-03126 · 대표 박제혁
          <br />
          서울특별시 영등포구 국회대로38길 8, 403호(당산동3가, 문화빌딩)
          <br />
          고객문의{' '}
          <a
            href="mailto:ads.runwaykorea@gmail.com"
            className="text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            ads.runwaykorea@gmail.com
          </a>{' '}
          (접수 후 순차 회신)
        </p>
      </footer>
    </main>
  );
}
