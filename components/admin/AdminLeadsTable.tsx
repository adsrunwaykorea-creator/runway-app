'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/date';
import { downloadConsultationLeadsCsv } from '@/lib/admin/consultation-leads-csv';
import {
  CONSULTATION_LEAD_STATUSES,
  type ConsultationLeadRow,
  type ConsultationLeadStatus,
} from '@/types/consultation-lead';

function displayNamePhone(lead: ConsultationLeadRow): string {
  const name = lead.lead_name?.trim();
  const phone = lead.phone?.trim();
  if (name && phone) return `${name} / ${phone}`;
  return name || phone || '-';
}

function displayRegion(lead: ConsultationLeadRow): string {
  const region = lead.region?.trim();
  if (!region || region === '미입력') return '-';
  return region;
}

function displayGoal(lead: ConsultationLeadRow): string {
  return lead.goal?.trim() || '-';
}

function displayMessage(lead: ConsultationLeadRow): string {
  return lead.message?.trim() || '-';
}

type Props = {
  leads: ConsultationLeadRow[];
  loading: boolean;
  loadError: string | null;
  onUpdateLead: (
    id: string,
    patch: { status?: ConsultationLeadStatus; admin_memo?: string },
  ) => Promise<boolean>;
};

export function AdminLeadsTable({ leads, loading, loadError, onUpdateLead }: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const memoValue = (lead: ConsultationLeadRow) =>
    memoDrafts[lead.id] ?? lead.admin_memo ?? '';

  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [leads],
  );

  if (loading) {
    return <p className="text-sm text-zinc-500">상담신청 데이터를 불러오는 중...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        상담신청 내역을 불러오지 못했습니다. ({loadError})
      </div>
    );
  }

  if (sortedLeads.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        저장된 상담신청 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">총 {sortedLeads.length}건 (최신순)</p>
        <button
          type="button"
          onClick={() => downloadConsultationLeadsCsv(sortedLeads)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-zinc-50"
        >
          CSV 다운로드
        </button>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-3">신청일</th>
              <th className="px-3 py-3">이름 / 연락처</th>
              <th className="px-3 py-3">업종</th>
              <th className="px-3 py-3">지역</th>
              <th className="px-3 py-3">월 예산</th>
              <th className="px-3 py-3">상담 목적</th>
              <th className="px-3 py-3">문의 내용</th>
              <th className="px-3 py-3">유입경로</th>
              <th className="px-3 py-3">처리상태</th>
              <th className="px-3 py-3 min-w-[220px]">관리자 메모</th>
            </tr>
          </thead>
          <tbody>
            {sortedLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-3 whitespace-nowrap text-zinc-700">{formatDate(lead.created_at)}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{displayNamePhone(lead)}</td>
                <td className="px-3 py-3">{lead.business_type}</td>
                <td className="px-3 py-3">{displayRegion(lead)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{lead.monthly_budget}</td>
                <td className="px-3 py-3 max-w-[180px] whitespace-pre-wrap break-words text-zinc-700">
                  {displayGoal(lead)}
                </td>
                <td className="px-3 py-3 max-w-[220px] whitespace-pre-wrap break-words text-zinc-700">
                  {displayMessage(lead)}
                </td>
                <td className="px-3 py-3">{lead.page_source ?? '-'}</td>
                <td className="px-3 py-3">
                  <select
                    value={lead.status}
                    onChange={async (event) => {
                      setSavingId(lead.id);
                      await onUpdateLead(lead.id, {
                        status: event.target.value as ConsultationLeadStatus,
                      });
                      setSavingId(null);
                    }}
                    disabled={savingId === lead.id}
                    className="w-full min-w-[110px] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  >
                    {CONSULTATION_LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={memoValue(lead)}
                      onChange={(event) =>
                        setMemoDrafts((prev) => ({ ...prev, [lead.id]: event.target.value }))
                      }
                      rows={3}
                      placeholder="관리자 메모"
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={savingId === lead.id}
                      onClick={async () => {
                        setSavingId(lead.id);
                        await onUpdateLead(lead.id, { admin_memo: memoValue(lead) });
                        setSavingId(null);
                      }}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      메모 저장
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
