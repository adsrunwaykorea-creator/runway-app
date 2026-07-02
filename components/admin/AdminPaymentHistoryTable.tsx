'use client';

import { useMemo } from 'react';
import { formatDate } from '@/lib/date';
import type { PaymentHistoryRow } from '@/types/payment-history';

function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  payments: PaymentHistoryRow[];
  loading: boolean;
  loadError: string | null;
};

export function AdminPaymentHistoryTable({ payments, loading, loadError }: Props) {
  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()),
    [payments],
  );

  if (loading) {
    return <p className="text-sm text-zinc-500">결제 완료 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        결제 완료 내역을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        저장된 결제 완료 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
      <table className="min-w-[960px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-3 py-3">결제일</th>
            <th className="px-3 py-3">고객명 / 연락처</th>
            <th className="px-3 py-3">상품명</th>
            <th className="px-3 py-3">금액</th>
            <th className="px-3 py-3">업체명</th>
            <th className="px-3 py-3">결제수단</th>
            <th className="px-3 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 align-top">
              <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.paid_at)}</td>
              <td className="px-3 py-3 font-medium text-slate-900">
                {row.customer_name} / {row.customer_phone}
              </td>
              <td className="px-3 py-3">{row.product_name}</td>
              <td className="px-3 py-3 whitespace-nowrap font-semibold text-blue-700">
                {formatPrice(row.amount)}
              </td>
              <td className="px-3 py-3">{row.company_name ?? '-'}</td>
              <td className="px-3 py-3">{row.payment_method === 'kakao_pay' ? '카카오페이' : row.payment_method}</td>
              <td className="px-3 py-3">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {row.payment_status === 'paid' ? '결제완료' : row.payment_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
