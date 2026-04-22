'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type ConfirmViewState = 'idle' | 'loading' | 'success' | 'error';

type ConfirmApiResponse = {
  ok?: boolean;
  alreadyProcessed?: boolean;
  message?: string;
  paymentMode?: 'test' | 'live';
  paymentStatus?: string | null;
  summary?: {
    service?: string;
    amount?: number;
    /** 구 응답 호환 */
    price?: number;
  };
  order?: {
    user_id?: string | null;
    order_id?: string | null;
    payment_key?: string | null;
    service?: string;
    period?: string;
    amount?: number;
    price?: number;
    status?: string;
    confirmation_channel?: 'kakao' | 'sms' | null;
    receipt_channel?: 'kakao' | 'sms' | null;
  } | null;
};

type ConfirmRunOutcome =
  | { ok: true; result: ConfirmApiResponse; fromSessionCache: boolean }
  | { ok: false; message: string };

type FinalPaymentState = {
  serviceName: string;
  amount: number;
  receiptChannelLabel: '문자' | '카카오';
  orderNumber: string;
  periodLabel: string;
};

/** React Strict Mode 이중 effect·재방문 시에도 confirm POST가 한 번만 나가도록 (setState 없음) */
const confirmFetchByKey = new Map<string, Promise<ConfirmRunOutcome>>();

async function runConfirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<ConfirmRunOutcome> {
  const sessionConfirmKey = `confirm:${paymentKey}`;
  const sessionConfirmDataKey = `confirm-data:${paymentKey}`;
  const alreadyConfirmed = window.sessionStorage.getItem(sessionConfirmKey) === 'done';
  const cachedResultRaw = window.sessionStorage.getItem(sessionConfirmDataKey);

  if (alreadyConfirmed && cachedResultRaw) {
    try {
      const cached = JSON.parse(cachedResultRaw) as ConfirmApiResponse;
      return { ok: true, result: cached, fromSessionCache: true };
    } catch {
      return { ok: false, message: '저장된 결제 확인 데이터가 손상되었습니다.' };
    }
  }

  const raw = window.localStorage.getItem(`runway_order_${orderId}`);
  if (!raw) {
    return { ok: false, message: '임시 주문 정보가 없습니다. 다시 시도해주세요.' };
  }

  const pendingOrder = JSON.parse(raw) as {
    service?: string;
    service_key?: string;
    period?: string;
    amount?: number;
    price?: number;
    customer_name?: string;
    customer_phone?: string;
    receipt_channel?: 'kakao' | 'sms';
    business_name?: string | null;
  };

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
        amount: pendingOrder.amount ?? pendingOrder.price,
        customer_name: pendingOrder.customer_name,
        customer_phone: pendingOrder.customer_phone,
        receipt_channel: pendingOrder.receipt_channel,
        business_name: pendingOrder.business_name,
      },
    }),
  });

  const result = (await response.json()) as ConfirmApiResponse;
  if (!response.ok || !result.ok) {
    return {
      ok: false,
      message: result.message || '결제 저장 중 오류가 발생했습니다.',
    };
  }

  window.sessionStorage.setItem(sessionConfirmKey, 'done');
  window.sessionStorage.setItem(sessionConfirmDataKey, JSON.stringify(result));
  window.localStorage.removeItem(`runway_order_${orderId}`);

  return { ok: true, result, fromSessionCache: false };
}

function resolvePaidAmount(
  result: ConfirmApiResponse,
  pendingAmount: number | undefined,
  queryAmount: number
): number {
  const fromSummary = Number(result.summary?.amount ?? result.summary?.price);
  const fromOrder = Number(result.order?.amount ?? result.order?.price);
  const fromPending = Number(pendingAmount);
  for (const n of [fromSummary, fromOrder, fromPending, queryAmount]) {
    if (Number.isFinite(n) && n > 0) return n;
  }
  return queryAmount;
}

function resolveReceiptChannel(result: ConfirmApiResponse): 'kakao' | 'sms' {
  const ch = result.order?.confirmation_channel ?? result.order?.receipt_channel;
  return ch === 'sms' ? 'sms' : 'kakao';
}

export default function PaymentSuccessPage() {
  const [viewState, setViewState] = useState<ConfirmViewState>('idle');
  const [message, setMessage] = useState('테스트 결제 완료 정보를 확인 중입니다...');
  const [finalState, setFinalState] = useState<FinalPaymentState | null>(null);

  useEffect(() => {
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

    const workKey = `${orderId}::${paymentKey}`;
    setViewState('loading');

    let fetchWork = confirmFetchByKey.get(workKey);
    if (!fetchWork) {
      fetchWork = runConfirmPayment(paymentKey, orderId, amount);
      confirmFetchByKey.set(workKey, fetchWork);
    }

    let cancelled = false;
    void fetchWork
      .then((outcome) => {
        if (cancelled) return;

        if (!outcome.ok) {
          console.log('[PAYMENT_CONFIRM_ERROR]', outcome.message);
          setMessage(outcome.message);
          setViewState('error');
          return;
        }

        const { result, fromSessionCache } = outcome;

        const resolvedService = result.summary?.service ?? result.order?.service ?? '선택 상품';
        const resolvedAmt = resolvePaidAmount(result, undefined, amount);
        const periodLabel =
          result.order?.period === 'monthly' ? '1개월' : result.order?.period === 'quarterly' ? '3개월' : '-';
        const alreadyProcessed = Boolean(fromSessionCache || result.alreadyProcessed);
        if (alreadyProcessed) {
          console.log('[PAYMENT_CONFIRM_ALREADY_PROCESSED]', { orderId });
        }

        setFinalState({
          serviceName: resolvedService,
          amount: resolvedAmt,
          receiptChannelLabel: resolveReceiptChannel(result) === 'sms' ? '문자' : '카카오',
          orderNumber: result.order?.order_id ?? orderId,
          periodLabel,
        });
        setViewState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.log('[PAYMENT_CONFIRM_FATAL]', err);
        setMessage('결제 정보 확인 과정에서 일시적인 문제가 발생했습니다.');
        setViewState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const formattedPrice =
    finalState && Number.isFinite(finalState.amount)
      ? `₩${finalState.amount.toLocaleString('ko-KR')}`
      : '-';

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>RUNWAY PAYMENT</p>
          <h1 className={styles.title}>
            {viewState === 'error' ? '결제 확인 중 문제가 발생했습니다' : '결제가 완료되었습니다'}
          </h1>
          <p className={styles.subtitle}>
            {viewState === 'error'
              ? '결제 정보 확인 중 오류가 발생했습니다. 다시 시도하거나 상담으로 문의해주세요.'
              : (
                <>
                  신청하신 서비스가 정상적으로 접수되었습니다
                  <br />
                  확인서는 선택하신 채널로 순차 발송됩니다
                </>
              )}
          </p>
        </div>

        <div className={styles.content}>
          {viewState !== 'success' ? <p className={styles.message}>{message}</p> : null}

          {viewState === 'loading' || viewState === 'idle' ? (
            <div className={styles.loadingBox}>결제 내역을 안전하게 확인하고 있습니다...</div>
          ) : null}

          {viewState === 'success' ? (
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span>서비스</span>
                <strong>{finalState?.serviceName || '선택 상품'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>기간</span>
                <strong>{finalState?.periodLabel ?? '-'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>결제 금액</span>
                <strong>{formattedPrice}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>확인서 발송 채널</span>
                <strong>{finalState?.receiptChannelLabel ?? '카카오'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>주문번호</span>
                <strong>{finalState?.orderNumber ?? '-'}</strong>
              </div>
              <p className={styles.storageNotice}>신청 내역이 정상적으로 저장되었습니다.</p>
            </div>
          ) : null}
        </div>

        <div className={styles.actions}>
          {viewState === 'success' ? (
            <>
              <Link href="/" className={`${styles.button} ${styles.primaryButton}`}>
                홈으로 이동
              </Link>
              <p className={styles.actionGuide}>확인서는 선택하신 채널로 순차 발송됩니다.</p>
            </>
          ) : null}

          {viewState === 'error' ? (
            <>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                다시 확인하기
              </button>
              <Link href="/" className={`${styles.button} ${styles.primaryButton}`}>
                홈으로 돌아가기
              </Link>
            </>
          ) : null}

          {viewState !== 'success' && viewState !== 'error' ? (
            <Link href="/payment" className={`${styles.button} ${styles.primaryButton}`}>
              결제 페이지로 이동
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
