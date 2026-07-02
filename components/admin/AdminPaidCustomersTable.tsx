'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/date';
import { downloadPaymentHistoryCsv } from '@/lib/admin/payment-history-csv';
import {
  formatPaymentChannel,
  PAYMENT_MANAGEMENT_STATUSES,
} from '@/lib/payment/payment-constants';
import type { PaymentHistoryRow } from '@/types/payment-history';

function formatPrice(value: number) {
  if (!value || value <= 0) return '-';
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  payments: PaymentHistoryRow[];
  loading: boolean;
  loadError: string | null;
  onUpdatePayment: (
    id: string,
    patch: Partial<{
      admin_memo: string;
      management_status: string;
    }>,
  ) => Promise<boolean>;
  onAction: (
    id: string,
    action: 'renew_request' | 'add_payment' | 'refund' | 'end_service',
    extra?: { admin_memo?: string; amount?: number },
  ) => Promise<boolean>;
};

export function AdminPaidCustomersTable({
  payments,
  loading,
  loadError,
  onUpdatePayment,
  onAction,
}: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()),
    [payments],
  );

  const activePayments = sorted.filter((row) => row.payment_status === 'paid');
  const memoValue = (row: PaymentHistoryRow) => memoDrafts[row.id] ?? row.admin_memo ?? '';

  if (loading) {
    return <p className="text-sm text-zinc-500">결제 완료 고객 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        결제 완료 고객 목록을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (activePayments.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        저장된 결제 완료 고객이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">총 {activePayments.length}명 (결제수단 전체 포함)</p>
        <button
          type="button"
          onClick={() => downloadPaymentHistoryCsv(activePayments)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-zinc-50"
        >
          CSV 다운로드
        </button>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
        <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-3">이름</th>
              <th className="px-3 py-3">연락처</th>
              <th className="px-3 py-3">회사명</th>
              <th className="px-3 py-3">업종</th>
              <th className="px-3 py-3 min-w-[180px]">문의내용</th>
              <th className="px-3 py-3">결제수단</th>
              <th className="px-3 py-3">결제금액</th>
              <th className="px-3 py-3">결제일</th>
              <th className="px-3 py-3 min-w-[180px]">관리자 메모</th>
              <th className="px-3 py-3 min-w-[200px]">관리</th>
            </tr>
          </thead>
          <tbody>
            {activePayments.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-3 font-medium text-slate-900">{row.customer_name}</td>
                <td className="px-3 py-3">{row.customer_phone}</td>
                <td className="px-3 py-3">{row.company_name ?? '-'}</td>
                <td className="px-3 py-3">{row.business_type ?? '-'}</td>
                <td className="px-3 py-3 text-zinc-700">{row.consultation_message?.trim() || '-'}</td>
                <td className="px-3 py-3">{formatPaymentChannel(row.payment_method)}</td>
                <td className="px-3 py-3 whitespace-nowrap font-semibold text-blue-700">
                  {formatPrice(row.amount)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.paid_at)}</td>
                <td className="px-3 py-3">
                  <textarea
                    value={memoValue(row)}
                    onChange={(event) =>
                      setMemoDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="관리자 메모"
                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={actingId === row.id}
                    onClick={async () => {
                      setActingId(row.id);
                      await onUpdatePayment(row.id, { admin_memo: memoValue(row) });
                      setActingId(null);
                    }}
                    className="mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    메모 저장
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="mb-2">
                    <select
                      value={row.management_status ?? '서비스중'}
                      disabled={actingId === row.id}
                      onChange={async (event) => {
                        setActingId(row.id);
                        await onUpdatePayment(row.id, { management_status: event.target.value });
                        setActingId(null);
                      }}
                      className="min-w-[100px] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {PAYMENT_MANAGEMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={async () => {
                        setActingId(row.id);
                        await onAction(row.id, 'renew_request');
                        setActingId(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      재결제 요청
                    </button>
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={async () => {
                        setActingId(row.id);
                        await onAction(row.id, 'add_payment');
                        setActingId(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      결제 추가
                    </button>
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={async () => {
                        if (!window.confirm('환불 처리하시겠습니까?')) return;
                        setActingId(row.id);
                        await onAction(row.id, 'refund');
                        setActingId(null);
                      }}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                    >
                      환불 처리
                    </button>
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={async () => {
                        if (!window.confirm('서비스를 종료하시겠습니까?')) return;
                        setActingId(row.id);
                        await onAction(row.id, 'end_service');
                        setActingId(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-semibold"
                    >
                      서비스 종료
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
