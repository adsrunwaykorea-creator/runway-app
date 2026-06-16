'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KAKAO_PAY_CHECKOUT_PRODUCT } from '@/lib/checkout/kakao-pay-product';
import { RUNWAY_BUSINESS_INFO } from '@/lib/site/business-info';
import { CHECKOUT_COMPLETE_STORAGE_KEY, type CheckoutCompleteSummary } from '@/types/payment-request';

const INDUSTRY_OPTIONS = [
  '교육/학원',
  '보험/금융',
  '프랜차이즈',
  '부동산/중개',
  '법률/세무/회계',
  '의료/건강',
  'IT/소프트웨어',
  'B2B 전문 서비스',
  '기타',
];

function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function servicePeriodLabel(days: number) {
  return `결제일로부터 ${days}일`;
}

export default function CheckoutClient() {
  const router = useRouter();
  const product = KAKAO_PAY_CHECKOUT_PRODUCT;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(customerName.trim() && customerPhone.trim() && customerEmail.trim()) &&
      privacyAgreed &&
      termsAgreed &&
      !loading,
    [customerEmail, customerName, customerPhone, loading, privacyAgreed, termsAgreed],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/kakao-pay-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          businessName: businessName.trim(),
          businessType: businessType.trim(),
          message: message.trim(),
          privacyAgreed,
          termsAgreed,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message ?? '결제 신청에 실패했습니다.');
      }

      const summary: CheckoutCompleteSummary = {
        name: result.summary?.name ?? customerName.trim(),
        productName: result.summary?.productName ?? product.name,
        amount: result.summary?.amount ?? product.amount,
        createdAt: result.summary?.createdAt ?? new Date().toISOString(),
      };
      sessionStorage.setItem(CHECKOUT_COMPLETE_STORAGE_KEY, JSON.stringify(summary));
      router.push('/checkout/complete');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '결제 신청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">RUNWAY CHECKOUT</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">런웨이 서비스 결제 신청</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            로그인 없이 서비스 상품을 선택하고 고객 정보를 입력한 뒤 결제를 신청할 수 있습니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">결제 상품 선택</h2>
            <label className="mt-4 flex cursor-pointer gap-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 p-4 sm:p-5">
              <input type="radio" name="product" checked readOnly className="mt-1 h-4 w-4" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900">{product.name}</p>
                <p className="mt-1 text-xl font-extrabold text-blue-700">{formatPrice(product.amount)}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{product.description}</p>
                <p className="mt-2 text-sm font-medium text-zinc-600">
                  제공 기간: {servicePeriodLabel(product.servicePeriodDays)}
                </p>
              </div>
            </label>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">고객 정보</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-zinc-800">이름 *</span>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="홍길동"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-zinc-800">연락처 *</span>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneInput(e.target.value))}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="010-1234-5678"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-semibold text-zinc-800">이메일 *</span>
                <input
                  required
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="example@email.com"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-zinc-800">업체명</span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="OO교육"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-zinc-800">업종</span>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  <option value="">선택해주세요</option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-semibold text-zinc-800">문의 내용</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="결제 및 서비스 관련 문의사항을 입력해주세요"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">결제 정보 확인</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 sm:flex-row sm:justify-between">
                <dt className="font-semibold text-zinc-600">선택 상품명</dt>
                <dd className="font-medium text-slate-900">{product.name}</dd>
              </div>
              <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 sm:flex-row sm:justify-between">
                <dt className="font-semibold text-zinc-600">결제 금액</dt>
                <dd className="text-lg font-extrabold text-blue-700">{formatPrice(product.amount)}</dd>
              </div>
              <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 sm:flex-row sm:justify-between">
                <dt className="font-semibold text-zinc-600">부가세 포함 여부</dt>
                <dd className="font-medium text-slate-900">{product.vatIncluded ? '부가세 포함' : '부가세 별도'}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="font-semibold text-zinc-600">서비스 제공 기간</dt>
                <dd className="font-medium text-slate-900">{servicePeriodLabel(product.servicePeriodDays)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">서비스 상세 · 환불규정</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">
              <li>서비스 착수 전: 전액 환불 가능</li>
              <li>서비스 착수 후: 진행된 업무 범위에 따라 환불 금액 산정</li>
              <li>광고비는 매체 정책에 따름</li>
            </ul>
            <p className="mt-4 text-sm text-zinc-600">
              자세한 내용은{' '}
              <Link href="/refund-policy" className="font-semibold text-blue-700 underline">
                환불정책
              </Link>
              을 확인해주세요.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">약관 동의</h2>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>개인정보 수집 및 이용에 동의합니다. (필수)</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  서비스 이용조건 및{' '}
                  <Link href="/refund-policy" className="font-semibold text-blue-700 underline">
                    환불규정
                  </Link>
                  에 동의합니다. (필수)
                </span>
              </label>
            </div>
          </section>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-[10px] bg-[#FEE500] text-base font-bold text-[#191919] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '신청 접수 중...' : '카카오페이로 결제하기'}
          </button>
        </form>

        <footer className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
          <h2 className="text-base font-bold text-slate-900">사업자 정보</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <span className="font-semibold">상호명:</span> {RUNWAY_BUSINESS_INFO.companyName}
            </li>
            <li>
              <span className="font-semibold">대표자명:</span> {RUNWAY_BUSINESS_INFO.representative}
            </li>
            <li>
              <span className="font-semibold">사업자등록번호:</span>{' '}
              {RUNWAY_BUSINESS_INFO.businessRegistrationNumber}
            </li>
            <li>
              <span className="font-semibold">사업장 주소:</span> {RUNWAY_BUSINESS_INFO.address}
            </li>
            <li>
              <span className="font-semibold">이메일:</span>{' '}
              <a href={`mailto:${RUNWAY_BUSINESS_INFO.email}`} className="text-blue-700 underline">
                {RUNWAY_BUSINESS_INFO.email}
              </a>
            </li>
            <li>
              <span className="font-semibold">통신판매업 신고번호:</span>{' '}
              {RUNWAY_BUSINESS_INFO.ecommerceRegistration}
            </li>
          </ul>
          <p className="mt-4">
            <Link href="/" className="font-semibold text-blue-700 underline">
              홈으로 돌아가기
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
