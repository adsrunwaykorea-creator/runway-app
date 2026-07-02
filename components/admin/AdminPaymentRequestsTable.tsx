'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/date';
import {
  formatPaymentChannel,
  PAYMENT_CHANNELS,
  PAYMENT_REQUEST_STATUSES,
} from '@/lib/payment/payment-constants';
import type { PaymentRequestRow } from '@/types/payment-request';
import type { PaymentRequestStatus } from '@/lib/payment/payment-constants';

function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  requests: PaymentRequestRow[];
  loading: boolean;
  loadError: string | null;
  onUpdateRequest: (
    id: string,
    patch: Partial<{
      status: PaymentRequestStatus | string;
      payment_channel: string;
      depositor_name: string;
      tax_invoice_required: boolean;
      admin_memo: string;
    }>,
  ) => Promise<boolean>;
  onCompletePayment: (id: string) => Promise<boolean>;
};

export function AdminPaymentRequestsTable({
  requests,
  loading,
  loadError,
  onUpdateRequest,
  onCompletePayment,
}: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [depositorDrafts, setDepositorDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [requests],
  );

  const memoValue = (row: PaymentRequestRow) => memoDrafts[row.id] ?? row.admin_memo ?? '';
  const depositorValue = (row: PaymentRequestRow) => depositorDrafts[row.id] ?? row.depositor_name ?? '';

  if (loading) {
    return <p className="text-sm text-zinc-500">결제 요청 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        결제 요청 내역을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        대기 중인 결제 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
      <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-3 py-3">요청일</th>
            <th className="px-3 py-3">고객명 / 연락처</th>
            <th className="px-3 py-3">업체명</th>
            <th className="px-3 py-3">업종</th>
            <th className="px-3 py-3">상품명</th>
            <th className="px-3 py-3">결제요청금액</th>
            <th className="px-3 py-3">결제수단</th>
            <th className="px-3 py-3">입금자명</th>
            <th className="px-3 py-3">세금계산서</th>
            <th className="px-3 py-3">상태</th>
            <th className="px-3 py-3 min-w-[200px]">관리자 메모</th>
            <th className="px-3 py-3">처리</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 align-top">
              <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
              <td className="px-3 py-3 font-medium text-slate-900">
                {row.name} / {row.phone}
              </td>
              <td className="px-3 py-3">{row.company ?? '-'}</td>
              <td className="px-3 py-3">{row.business_type ?? '-'}</td>
              <td className="px-3 py-3">{row.product_name}</td>
              <td className="px-3 py-3 whitespace-nowrap font-semibold text-blue-700">
                {formatPrice(row.amount)}
              </td>
              <td className="px-3 py-3">
                <select
                  value={row.payment_channel ?? 'bank_transfer'}
                  disabled={savingId === row.id}
                  onChange={async (event) => {
                    setSavingId(row.id);
                    await onUpdateRequest(row.id, { payment_channel: event.target.value });
                    setSavingId(null);
                  }}
                  className="min-w-[110px] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                >
                  {PAYMENT_CHANNELS.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3">
                <input
                  type="text"
                  value={depositorValue(row)}
                  onChange={(event) =>
                    setDepositorDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                  }
                  placeholder="입금자명"
                  className="w-full min-w-[100px] rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={savingId === row.id}
                  onClick={async () => {
                    setSavingId(row.id);
                    await onUpdateRequest(row.id, { depositor_name: depositorValue(row) });
                    setSavingId(null);
                  }}
                  className="mt-1 text-xs font-semibold text-zinc-600 underline"
                >
                  저장
                </button>
              </td>
              <td className="px-3 py-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.tax_invoice_required === true}
                    disabled={savingId === row.id}
                    onChange={async (event) => {
                      setSavingId(row.id);
                      await onUpdateRequest(row.id, { tax_invoice_required: event.target.checked });
                      setSavingId(null);
                    }}
                  />
                  <span className="text-xs">{row.tax_invoice_required ? '필요' : '불필요'}</span>
                </label>
              </td>
              <td className="px-3 py-3">
                <select
                  value={row.status === '결제대기' ? '입금대기' : row.status}
                  disabled={savingId === row.id}
                  onChange={async (event) => {
                    setSavingId(row.id);
                    await onUpdateRequest(row.id, { status: event.target.value });
                    setSavingId(null);
                  }}
                  className="min-w-[100px] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                >
                  {PAYMENT_REQUEST_STATUSES.filter((s) => s !== '결제완료').map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
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
                  disabled={savingId === row.id}
                  onClick={async () => {
                    setSavingId(row.id);
                    await onUpdateRequest(row.id, { admin_memo: memoValue(row) });
                    setSavingId(null);
                  }}
                  className="mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  메모 저장
                </button>
              </td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  disabled={completingId === row.id || row.status === '결제완료'}
                  onClick={async () => {
                    if (!window.confirm(`${row.name} 고객을 결제완료 처리할까요?`)) return;
                    setCompletingId(row.id);
                    await onCompletePayment(row.id);
                    setCompletingId(null);
                  }}
                  className="whitespace-nowrap rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {completingId === row.id ? '처리 중...' : '결제완료 처리'}
                </button>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatPaymentChannel(row.payment_channel ?? row.payment_method)}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
