'use client';

import { formatDate } from '@/lib/date';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import type { EndedSubscriberRow } from '@/types/subscriber';

function formatPrice(value: number) {
  if (!value || value <= 0) return '-';
  return `₩${value.toLocaleString('ko-KR')}`;
}

type Props = {
  endedSubscribers: EndedSubscriberRow[];
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
};

export function AdminEndedSubscribersTable({
  endedSubscribers,
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
}: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">서비스 종료 고객 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        서비스 종료 고객 목록을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        ended_subscribers 테이블이 없습니다. Supabase에서{' '}
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

      {endedSubscribers.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
          서비스 종료 고객이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {endedSubscribers.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm"
            >
              <p className="text-xs text-zinc-500">서비스 종료일 {formatDate(row.ended_at)}</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">
                {row.company ?? '-'} · {row.name}
              </h3>
              <p className="mt-1 text-sm text-zinc-600">
                {row.phone} · {row.business_type ?? '-'}
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {row.product_name} · {formatPrice(row.payment_amount)}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                서비스 {row.service_start_date ? formatDate(row.service_start_date) : '-'} ~{' '}
                {row.service_end_date ? formatDate(row.service_end_date) : '-'}
              </p>
              {row.admin_memo ? (
                <p className="mt-2 rounded-lg bg-white p-3 text-sm text-zinc-700">{row.admin_memo}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <AdminPagination total={total} page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
