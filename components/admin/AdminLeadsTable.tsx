'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { downloadConsultationLeadsCsv } from '@/lib/admin/consultation-leads-csv';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import {
  SubscriberRegisterModal,
  type SubscriberRegisterForm,
} from '@/components/admin/SubscriberRegisterModal';
import {
  CONSULTATION_LEAD_ENDED_STATUS,
  CONSULTATION_LEAD_MANUAL_STATUSES,
  normalizeConsultationLeadStatus,
  type ConsultationLeadRow,
  type ConsultationLeadManualStatus,
} from '@/types/consultation-lead';

function displayCompany(lead: ConsultationLeadRow): string {
  return lead.company_name?.trim() || lead.company?.trim() || '-';
}

function leadStatusValue(lead: ConsultationLeadRow): ConsultationLeadManualStatus {
  const normalized = normalizeConsultationLeadStatus(lead.status);
  return (CONSULTATION_LEAD_MANUAL_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as ConsultationLeadManualStatus)
    : '신규';
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
  onUpdateLead: (
    lead: ConsultationLeadRow,
    patch: {
      status?: ConsultationLeadManualStatus | typeof CONSULTATION_LEAD_ENDED_STATUS;
      admin_memo?: string;
      message?: string;
      payment_status?: string;
    },
  ) => Promise<boolean>;
  onRegisterSubscriber: (
    lead: ConsultationLeadRow,
    form: SubscriberRegisterForm,
  ) => Promise<boolean>;
  onEndConsultation: (lead: ConsultationLeadRow) => Promise<boolean>;
};

export function AdminLeadsTable({
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
  onUpdateLead,
  onRegisterSubscriber,
  onEndConsultation,
}: Props) {
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [registerLead, setRegisterLead] = useState<ConsultationLeadRow | null>(null);
  const [registering, setRegistering] = useState(false);

  const memoValue = (lead: ConsultationLeadRow) => memoDrafts[lead.id] ?? lead.admin_memo ?? '';
  const messageValue = (lead: ConsultationLeadRow) => messageDrafts[lead.id] ?? lead.message ?? '';

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

  return (
    <>
      <SubscriberRegisterModal
        lead={registerLead}
        open={registerLead !== null}
        submitting={registering}
        onClose={() => setRegisterLead(null)}
        onSubmit={async (form) => {
          if (!registerLead) return false;
          setRegistering(true);
          const ok = await onRegisterSubscriber(registerLead, form);
          setRegistering(false);
          return ok;
        }}
      />

      <div className="space-y-4">
        <AdminSearchBar
          value={searchQuery}
          onChange={onSearchQueryChange}
          onSearch={onSearch}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => downloadConsultationLeadsCsv(leads)}
            disabled={leads.length === 0}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            CSV 다운로드
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
            표시할 상담신청 내역이 없습니다.
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
                    <p className="text-xs text-zinc-500">신청일 {formatDate(lead.created_at)}</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {lead.lead_name ?? '-'} · {displayCompany(lead)}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {lead.phone ?? '-'} · {lead.business_type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={leadStatusValue(lead)}
                      disabled={savingId === lead.id}
                      onChange={async (event) => {
                        if (!lead.id) return;
                        setSavingId(lead.id);
                        await onUpdateLead(lead, {
                          status: event.target.value as ConsultationLeadManualStatus,
                        });
                        setSavingId(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                    >
                      {CONSULTATION_LEAD_MANUAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={savingId === lead.id}
                      onClick={() => setRegisterLead(lead)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      가입자 등록
                    </button>
                    <button
                      type="button"
                      disabled={savingId === lead.id}
                      onClick={async () => {
                        if (!window.confirm('이 고객을 상담종료 처리할까요?')) return;
                        setSavingId(lead.id);
                        await onEndConsultation(lead);
                        setSavingId(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-60"
                    >
                      상담 종료
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-semibold text-zinc-600">문의내용</label>
                  <textarea
                    value={messageValue(lead)}
                    onChange={(event) =>
                      setMessageDrafts((prev) => ({ ...prev, [lead.id]: event.target.value }))
                    }
                    rows={3}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingId === lead.id}
                    onClick={async () => {
                      if (!lead.id) return;
                      setSavingId(lead.id);
                      await onUpdateLead(lead, { message: messageValue(lead) });
                      setSavingId(null);
                    }}
                    className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold disabled:opacity-60"
                  >
                    문의내용 저장
                  </button>
                </div>

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
                    disabled={savingId === lead.id}
                    onClick={async () => {
                      if (!lead.id) return;
                      setSavingId(lead.id);
                      await onUpdateLead(lead, { admin_memo: memoValue(lead) });
                      setSavingId(null);
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
    </>
  );
}
