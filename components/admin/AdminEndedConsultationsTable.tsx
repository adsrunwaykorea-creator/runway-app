'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import type { ConsultationLeadRow } from '@/types/consultation-lead';

function displayCompany(lead: ConsultationLeadRow): string {
  return lead.company_name?.trim() || lead.company?.trim() || '-';
}

type Props = {
  leads: ConsultationLeadRow[];
  loading: boolean;
  loadError: string | null;
  total: number;
  page: number;
  totalPages: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onRestore: (lead: ConsultationLeadRow) => Promise<boolean>;
  onUpdateMemo: (lead: ConsultationLeadRow, admin_memo: string) => Promise<boolean>;
};

export function AdminEndedConsultationsTable({
  leads,
  loading,
  loadError,
  total,
  page,
  totalPages,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onPageChange,
  onRestore,
  onUpdateMemo,
}: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const memoValue = (lead: ConsultationLeadRow) => memoDrafts[lead.id] ?? lead.admin_memo ?? '';

  if (loading) {
    return <p className="text-sm text-zinc-500">상담종료 고객 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        상담종료 고객 목록을 불러오지 못했습니다. ({loadError})
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

      {leads.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
          상담종료 고객이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500">
                    상담일 {formatDate(lead.created_at)} · 상담종료일{' '}
                    {lead.updated_at ? formatDate(lead.updated_at) : '-'}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {lead.lead_name ?? '-'} · {displayCompany(lead)}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {lead.phone ?? '-'} · {lead.business_type}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actingId === lead.id}
                  onClick={async () => {
                    if (!window.confirm('이 고객을 상담신청 내역(신규)으로 복구할까요?')) return;
                    setActingId(lead.id);
                    await onRestore(lead);
                    setActingId(null);
                  }}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  복구
                </button>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-zinc-700">
                {lead.message?.trim() || '문의내용 없음'}
              </p>

              <div className="mt-3">
                <label className="text-xs font-semibold text-zinc-600">관리자 메모</label>
                <textarea
                  value={memoValue(lead)}
                  onChange={(event) =>
                    setMemoDrafts((prev) => ({ ...prev, [lead.id]: event.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={actingId === lead.id}
                  onClick={async () => {
                    setActingId(lead.id);
                    await onUpdateMemo(lead, memoValue(lead));
                    setActingId(null);
                  }}
                  className="mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  메모 저장
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AdminPagination total={total} page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
