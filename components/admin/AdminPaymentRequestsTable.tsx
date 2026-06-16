'use client';

import { useMemo } from 'react';
import { formatDate } from '@/lib/date';
import type { PaymentRequestRow } from '@/types/payment-request';

function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  requests: PaymentRequestRow[];
  loading: boolean;
  loadError: string | null;
};

export function AdminPaymentRequestsTable({ requests, loading, loadError }: Props) {
  const sorted = useMemo(
    () => [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [requests],
  );

  if (loading) {
    return <p className="text-sm text-zinc-500">결제 신청 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        결제 신청 내역을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        저장된 결제 신청 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
      <table className="min-w-[880px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-3 py-3">신청일</th>
            <th className="px-3 py-3">이름 / 연락처</th>
            <th className="px-3 py-3">상품명</th>
            <th className="px-3 py-3">금액</th>
            <th className="px-3 py-3">업체명</th>
            <th className="px-3 py-3">업종</th>
            <th className="px-3 py-3">문의</th>
            <th className="px-3 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 align-top">
              <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
              <td className="px-3 py-3 font-medium text-slate-900">
                {row.name} / {row.phone}
              </td>
              <td className="px-3 py-3">{row.product_name}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatPrice(row.amount)}</td>
              <td className="px-3 py-3">{row.company ?? '-'}</td>
              <td className="px-3 py-3">{row.business_type ?? '-'}</td>
              <td className="px-3 py-3 max-w-[200px] whitespace-pre-wrap break-words">{row.message ?? '-'}</td>
              <td className="px-3 py-3">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
