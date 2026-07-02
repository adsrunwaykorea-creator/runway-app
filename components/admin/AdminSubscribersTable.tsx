'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { formatDday } from '@/lib/date-kst';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import type { SubscriberRow } from '@/types/subscriber';

function formatPrice(value: number) {
  if (!value || value <= 0) return '-';
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  subscribers: SubscriberRow[];
  loading: boolean;
  loadError: string | null;
  migrationRequired?: boolean;
  total: number;
  page: number;
  totalPages: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onUpdateSubscriber: (id: string, patch: Partial<{ admin_memo: string }>) => Promise<boolean>;
  onEndService: (id: string) => Promise<boolean>;
};

export function AdminSubscribersTable({
  subscribers,
  loading,
  loadError,
  migrationRequired,
  total,
  page,
  totalPages,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onPageChange,
  onUpdateSubscriber,
  onEndService,
}: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const memoValue = (row: SubscriberRow) => memoDrafts[row.id] ?? row.admin_memo ?? '';

  if (loading) {
    return <p className="text-sm text-zinc-500">가입자 명단을 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        가입자 명단을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        subscribers 테이블이 없습니다. Supabase에서{' '}
        <code className="rounded bg-amber-100 px-1">023_subscribers_and_ended.sql</code>을 실행해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminSearchBar
        value={searchQuery}
        onChange={onSearchQueryChange}
        onSearch={onSearch}
      />

      {subscribers.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
          등록된 가입자가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {subscribers.map((row) => {
            const serviceStart = row.service_start_date ? formatDate(row.service_start_date) : '-';
            const serviceEnd = row.service_end_date ? formatDate(row.service_end_date) : '-';
            const dday = formatDday(row.service_end_date);

            return (
              <article
                key={row.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">
                      서비스 시작일 {serviceStart}
                      <span className="mx-1 text-zinc-300">|</span>
                      등록일 {formatDate(row.created_at)}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {row.company ?? '-'} · {row.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {row.phone} · {row.business_type ?? '-'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {row.product_name} · {formatPrice(row.payment_amount)}
                    </p>
                    <div className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
                      <p>
                        서비스 기간: {serviceStart} ~ {serviceEnd}
                      </p>
                      <p className="mt-0.5 font-semibold text-emerald-800">만료까지 {dday}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={actingId === row.id}
                    onClick={async () => {
                      if (!window.confirm('서비스를 종료하고 서비스 종료 고객으로 이동할까요?')) return;
                      setActingId(row.id);
                      await onEndService(row.id);
                      setActingId(null);
                    }}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                  >
                    서비스 종료
                  </button>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-semibold text-zinc-600">관리자 메모</label>
                  <textarea
                    value={memoValue(row)}
                    onChange={(e) => setMemoDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={actingId === row.id}
                    onClick={async () => {
                      setActingId(row.id);
                      await onUpdateSubscriber(row.id, { admin_memo: memoValue(row) });
                      setActingId(null);
                    }}
                    className="mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    메모 저장
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AdminPagination total={total} page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
