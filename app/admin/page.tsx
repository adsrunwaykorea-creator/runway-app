'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasAdminAccess, isAdminDevBypassClient } from '@/lib/admin/access';
import { computeAdminDashboardMetrics } from '@/lib/admin/subscriber-metrics';
import { AdminEndedConsultationsTable } from '@/components/admin/AdminEndedConsultationsTable';
import { AdminEndedSubscribersTable } from '@/components/admin/AdminEndedSubscribersTable';
import { AdminLeadsTable } from '@/components/admin/AdminLeadsTable';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { AdminSubscribersTable } from '@/components/admin/AdminSubscribersTable';
import type { SubscriberRegisterForm } from '@/components/admin/SubscriberRegisterModal';
import {
  CONSULTATION_LEAD_ENDED_STATUS,
  type ConsultationLeadManualStatus,
  type ConsultationLeadRow,
  type PaginatedListMeta,
} from '@/types/consultation-lead';
import type { EndedSubscriberRow, SubscriberRow } from '@/types/subscriber';

type AdminAccessState = 'loading' | 'ready' | 'login_required' | 'forbidden';

type ListState<T> = {
  items: T[];
  meta: PaginatedListMeta;
  loading: boolean;
  error: string | null;
  searchDraft: string;
  searchApplied: string;
  page: number;
};

function emptyListState<T>(): ListState<T> {
  return {
    items: [],
    meta: { total: 0, page: 1, pageSize: 5, totalPages: 1 },
    loading: true,
    error: null,
    searchDraft: '',
    searchApplied: '',
    page: 1,
  };
}

function toIsoDate(dateInput: string): string {
  return new Date(`${dateInput}T12:00:00`).toISOString();
}

function buildQuery(page: number, q: string): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (q) params.set('q', q);
  return params.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const result = await response.json();
  if (!response.ok || !result?.success) {
    throw new Error(result?.message ?? `API 오류 (${response.status})`);
  }
  return result as T;
}

function AdminAccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="text-2xl font-extrabold text-slate-900">관리자 권한이 없습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">관리자 계정으로 로그인했는지 확인해 주세요.</p>
        <Link
          href="/login?next=/admin"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          로그인
        </Link>
      </section>
    </main>
  );
}

function AdminLoginRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h1 className="text-2xl font-extrabold text-slate-900">로그인이 필요합니다.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">관리자 페이지는 로그인 후 이용할 수 있습니다.</p>
        <Link
          href="/login?next=/admin"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          로그인하기
        </Link>
      </section>
    </main>
  );
}

export default function AdminPage() {
  const [accessState, setAccessState] = useState<AdminAccessState>('loading');
  const [leadsState, setLeadsState] = useState<ListState<ConsultationLeadRow>>(emptyListState);
  const [endedConsultationsState, setEndedConsultationsState] =
    useState<ListState<ConsultationLeadRow>>(emptyListState);
  const [subscribersState, setSubscribersState] = useState<ListState<SubscriberRow>>(emptyListState);
  const [endedSubscribersState, setEndedSubscribersState] =
    useState<ListState<EndedSubscriberRow>>(emptyListState);
  const [subscribersMigrationRequired, setSubscribersMigrationRequired] = useState(false);
  const [endedMigrationRequired, setEndedMigrationRequired] = useState(false);
  const [metricsSubscribers, setMetricsSubscribers] = useState<SubscriberRow[]>([]);
  const [metricsLeads, setMetricsLeads] = useState<ConsultationLeadRow[]>([]);
  const [metricsEndedCount, setMetricsEndedCount] = useState(0);

  const loadLeads = useCallback(async (page: number, q: string) => {
    setLeadsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchJson<{
        leads: ConsultationLeadRow[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/admin/consultation-leads?section=active&${buildQuery(page, q)}`);
      setLeadsState((prev) => ({
        ...prev,
        items: result.leads,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        loading: false,
        page,
        searchApplied: q,
      }));
    } catch (error) {
      console.error('[ADMIN_LEADS_LOAD]', error);
      setLeadsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'API 요청 실패',
      }));
    }
  }, []);

  const loadEndedConsultations = useCallback(async (page: number, q: string) => {
    setEndedConsultationsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchJson<{
        leads: ConsultationLeadRow[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/admin/consultation-leads?section=ended_consultation&${buildQuery(page, q)}`);
      setEndedConsultationsState((prev) => ({
        ...prev,
        items: result.leads,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        loading: false,
        page,
        searchApplied: q,
      }));
    } catch (error) {
      console.error('[ADMIN_ENDED_CONSULTATIONS_LOAD]', error);
      setEndedConsultationsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'API 요청 실패',
      }));
    }
  }, []);

  const loadSubscribers = useCallback(async (page: number, q: string) => {
    setSubscribersState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchJson<{
        subscribers: SubscriberRow[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        migrationRequired?: boolean;
      }>(`/api/admin/subscribers?${buildQuery(page, q)}`);
      setSubscribersMigrationRequired(result.migrationRequired === true);
      setSubscribersState((prev) => ({
        ...prev,
        items: result.subscribers,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        loading: false,
        page,
        searchApplied: q,
      }));
    } catch (error) {
      console.error('[ADMIN_SUBSCRIBERS_LOAD]', error);
      setSubscribersState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'API 요청 실패',
      }));
    }
  }, []);

  const loadEndedSubscribers = useCallback(async (page: number, q: string) => {
    setEndedSubscribersState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchJson<{
        endedSubscribers: EndedSubscriberRow[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        migrationRequired?: boolean;
      }>(`/api/admin/ended-subscribers?${buildQuery(page, q)}`);
      setEndedMigrationRequired(result.migrationRequired === true);
      setEndedSubscribersState((prev) => ({
        ...prev,
        items: result.endedSubscribers,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        loading: false,
        page,
        searchApplied: q,
      }));
    } catch (error) {
      console.error('[ADMIN_ENDED_SUBSCRIBERS_LOAD]', error);
      setEndedSubscribersState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'API 요청 실패',
      }));
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const [subsResult, leadsResult, endedResult] = await Promise.all([
        fetchJson<{ subscribers: SubscriberRow[] }>('/api/admin/subscribers?includeAll=1'),
        fetchJson<{ leads: ConsultationLeadRow[] }>('/api/admin/consultation-leads?includeAll=1'),
        fetchJson<{ endedSubscribers: EndedSubscriberRow[]; total: number }>(
          '/api/admin/ended-subscribers?includeAll=1',
        ),
      ]);
      setMetricsSubscribers(subsResult.subscribers);
      setMetricsLeads(leadsResult.leads);
      setMetricsEndedCount(endedResult.total ?? endedResult.endedSubscribers?.length ?? 0);
    } catch (error) {
      console.error('[ADMIN_METRICS_LOAD]', error);
    }
  }, []);

  const reloadAllData = useCallback(async () => {
    await Promise.all([
      loadLeads(leadsState.page, leadsState.searchApplied),
      loadEndedConsultations(endedConsultationsState.page, endedConsultationsState.searchApplied),
      loadSubscribers(subscribersState.page, subscribersState.searchApplied),
      loadEndedSubscribers(endedSubscribersState.page, endedSubscribersState.searchApplied),
      loadMetrics(),
    ]);
  }, [
    loadLeads,
    loadEndedConsultations,
    loadSubscribers,
    loadEndedSubscribers,
    loadMetrics,
    leadsState.page,
    leadsState.searchApplied,
    endedConsultationsState.page,
    endedConsultationsState.searchApplied,
    subscribersState.page,
    subscribersState.searchApplied,
    endedSubscribersState.page,
    endedSubscribersState.searchApplied,
  ]);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const init = async () => {
      if (isAdminDevBypassClient()) {
        if (!cancelled) setAccessState('ready');
      } else {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          if (!cancelled) setAccessState('login_required');
          return;
        }

        const { data: roleRow, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();

        if (roleError) {
          if (!cancelled) setAccessState('forbidden');
          return;
        }

        let allowed = hasAdminAccess(roleRow?.role ?? null, userData.user.email ?? null);
        if (!allowed) {
          try {
            const response = await fetch('/api/admin/access-check', { cache: 'no-store', credentials: 'include' });
            const result = await response.json();
            allowed = result?.allowed === true;
          } catch {
            allowed = false;
          }
        }

        if (!allowed) {
          if (!cancelled) setAccessState('forbidden');
          return;
        }

        if (!cancelled) setAccessState('ready');
      }

      await Promise.all([
        loadLeads(1, ''),
        loadEndedConsultations(1, ''),
        loadSubscribers(1, ''),
        loadEndedSubscribers(1, ''),
        loadMetrics(),
      ]);
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadLeads, loadEndedConsultations, loadSubscribers, loadEndedSubscribers, loadMetrics]);

  const formatPrice = (value: number) => `₩${value.toLocaleString('ko-KR')}`;

  const {
    thisMonthRevenue,
    thisMonthSubscriberCount,
    thisMonthLeadCount,
    activeSubscriberCount,
    expiringSoonCount,
    expiringThisMonthCount,
    endedCount,
  } = useMemo(
    () => computeAdminDashboardMetrics(metricsSubscribers, metricsLeads, metricsEndedCount),
    [metricsSubscribers, metricsLeads, metricsEndedCount],
  );

  const applyLeadToListState = useCallback(
    (updatedLead: ConsultationLeadRow) => {
      setLeadsState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updatedLead.id ? { ...item, ...updatedLead } : item)),
      }));
      setEndedConsultationsState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updatedLead.id ? { ...item, ...updatedLead } : item)),
      }));
    },
    [],
  );

  const updateLead = async (
    lead: ConsultationLeadRow,
    patch: {
      status?: ConsultationLeadManualStatus | typeof CONSULTATION_LEAD_ENDED_STATUS;
      admin_memo?: string;
      message?: string;
      payment_status?: string;
    },
  ): Promise<boolean> => {
    const leadId = lead.id?.trim();
    if (!leadId) {
      console.error('[ADMIN_LEAD_UPDATE] missing lead id', { lead, patch });
      return false;
    }

    try {
      const response = await fetch(`/api/admin/consultation-leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        const dbError = result?.error;
        console.error('[ADMIN_LEAD_UPDATE_ERROR]', {
          leadId,
          patch,
          httpStatus: response.status,
          message: result?.message,
          errorMessage: dbError?.message ?? null,
          errorCode: dbError?.code ?? null,
          errorDetails: dbError?.details ?? null,
          errorHint: dbError?.hint ?? null,
          result,
        });
        const detail = dbError?.message ? `\n(${dbError.message})` : '';
        window.alert(`${result?.message ?? '상담신청 정보 저장에 실패했습니다.'}${detail}`);
        return false;
      }

      if (result.lead) {
        applyLeadToListState(result.lead as ConsultationLeadRow);
      }

      await reloadAllData();
      return true;
    } catch (error) {
      console.error('[ADMIN_LEAD_UPDATE_ERROR]', { leadId, patch, error });
      return false;
    }
  };

  const endConsultation = async (lead: ConsultationLeadRow): Promise<boolean> =>
    updateLead(lead, { status: CONSULTATION_LEAD_ENDED_STATUS });

  const restoreConsultation = async (lead: ConsultationLeadRow): Promise<boolean> =>
    updateLead(lead, { status: '신규' });

  const registerSubscriber = async (
    lead: ConsultationLeadRow,
    form: SubscriberRegisterForm,
  ): Promise<boolean> => {
    const leadId = lead.id?.trim();
    if (!leadId) return false;

    try {
      const response = await fetch(
        `/api/admin/consultation-leads/${encodeURIComponent(leadId)}/register-subscriber`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            product_name: form.product_name,
            payment_method: form.payment_method,
            payment_amount: Number(form.payment_amount) || 0,
            paid_at: toIsoDate(form.paid_at),
            service_start_date: toIsoDate(form.service_start_date),
            service_end_date: toIsoDate(form.service_end_date),
            admin_memo: form.admin_memo,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result?.success) {
        console.error('[ADMIN_REGISTER_SUBSCRIBER_ERROR]', result);
        window.alert(result?.message ?? '가입자 등록에 실패했습니다.');
        return false;
      }
      await reloadAllData();
      return true;
    } catch (error) {
      console.error('[ADMIN_REGISTER_SUBSCRIBER_ERROR]', error);
      return false;
    }
  };

  const updateSubscriber = async (id: string, patch: Partial<{ admin_memo: string }>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/subscribers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) return false;
      await reloadAllData();
      return true;
    } catch (error) {
      console.error('[ADMIN_SUBSCRIBER_UPDATE_ERROR]', error);
      return false;
    }
  };

  const endSubscriberService = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/subscribers/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'end_service' }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        console.error('[ADMIN_END_SERVICE_ERROR]', result);
        window.alert(result?.message ?? '서비스 종료 처리에 실패했습니다.');
        return false;
      }
      await reloadAllData();
      return true;
    } catch (error) {
      console.error('[ADMIN_END_SERVICE_ERROR]', error);
      return false;
    }
  };

  if (accessState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 p-4">
        <p className="text-sm text-zinc-500">관리자 페이지를 불러오는 중...</p>
      </main>
    );
  }

  if (accessState === 'login_required') return <AdminLoginRequired />;
  if (accessState === 'forbidden') return <AdminAccessDenied />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">고객 관리</h1>
          <p className="mt-2 text-sm text-zinc-600">
            상담신청 → 결제완료 → 가입자등록 → 서비스 종료까지 한 화면에서 관리합니다.
          </p>

          {(subscribersMigrationRequired || endedMigrationRequired) && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              가입자 관리 테이블이 필요합니다. Supabase SQL Editor에서{' '}
              <code className="rounded bg-amber-100 px-1">023_subscribers_and_ended.sql</code>,{' '}
              <code className="rounded bg-amber-100 px-1">026_consultation_status_overhaul.sql</code>
              을 실행해 주세요.
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            <article className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700">이번 달 매출</p>
              <p className="mt-0.5 text-[10px] text-blue-600">결제일(paid_at) · 없으면 서비스 시작일</p>
              <p className="mt-1 text-xl font-extrabold text-blue-900">{formatPrice(thisMonthRevenue)}</p>
            </article>
            <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">이번 달 가입</p>
              <p className="mt-0.5 text-[10px] text-emerald-600">서비스 시작일 기준</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-900">{thisMonthSubscriberCount}</p>
            </article>
            <article className="rounded-lg border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700">이번 달 상담신청</p>
              <p className="mt-0.5 text-[10px] text-violet-600">신청일(created_at) 기준</p>
              <p className="mt-1 text-xl font-extrabold text-violet-900">{thisMonthLeadCount}</p>
            </article>
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">가입자 수</p>
              <p className="mt-0.5 text-[10px] text-amber-600">활성 가입자(진행중 등)</p>
              <p className="mt-1 text-xl font-extrabold text-amber-900">{activeSubscriberCount}</p>
            </article>
            <article className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold text-rose-700">만료 예정 (7일)</p>
              <p className="mt-0.5 text-[10px] text-rose-600">오늘~7일 이내 종료</p>
              <p className="mt-1 text-xl font-extrabold text-rose-900">{expiringSoonCount}</p>
            </article>
            <article className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold text-orange-700">이번 달 만료</p>
              <p className="mt-0.5 text-[10px] text-orange-600">서비스 종료일이 이번 달</p>
              <p className="mt-1 text-xl font-extrabold text-orange-900">{expiringThisMonthCount}</p>
            </article>
            <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-700">서비스 종료 고객</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">ended_subscribers 기준</p>
              <p className="mt-1 text-xl font-extrabold text-zinc-900">{endedCount}</p>
            </article>
          </div>
        </header>

        <AdminSectionCard
          title="상담신청 내역"
          subtitle="신규 · 상담중 · 연락완료 · 결제완료 고객 (결제완료는 가입자 등록 전 상태)"
          total={leadsState.meta.total}
          page={leadsState.meta.page}
          totalPages={leadsState.meta.totalPages}
          displayCount={leadsState.items.length}
        >
          <AdminLeadsTable
            leads={leadsState.items}
            loading={leadsState.loading}
            loadError={leadsState.error}
            total={leadsState.meta.total}
            page={leadsState.meta.page}
            totalPages={leadsState.meta.totalPages}
            searchQuery={leadsState.searchDraft}
            onSearchQueryChange={(value) =>
              setLeadsState((prev) => ({ ...prev, searchDraft: value }))
            }
            onSearch={() => {
              void loadLeads(1, leadsState.searchDraft.trim());
            }}
            onPageChange={(page) => {
              void loadLeads(page, leadsState.searchApplied);
            }}
            onUpdateLead={updateLead}
            onRegisterSubscriber={registerSubscriber}
            onEndConsultation={endConsultation}
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="가입자 명단"
          subtitle="subscribers 테이블에 등록된 가입자만 표시"
          total={subscribersState.meta.total}
          page={subscribersState.meta.page}
          totalPages={subscribersState.meta.totalPages}
          displayCount={subscribersState.items.length}
        >
          <AdminSubscribersTable
            subscribers={subscribersState.items}
            loading={subscribersState.loading}
            loadError={subscribersState.error}
            migrationRequired={subscribersMigrationRequired}
            total={subscribersState.meta.total}
            page={subscribersState.meta.page}
            totalPages={subscribersState.meta.totalPages}
            searchQuery={subscribersState.searchDraft}
            onSearchQueryChange={(value) =>
              setSubscribersState((prev) => ({ ...prev, searchDraft: value }))
            }
            onSearch={() => {
              void loadSubscribers(1, subscribersState.searchDraft.trim());
            }}
            onPageChange={(page) => {
              void loadSubscribers(page, subscribersState.searchApplied);
            }}
            onUpdateSubscriber={updateSubscriber}
            onEndService={endSubscriberService}
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="상담종료 고객"
          subtitle="상담이 종료된 고객 — 복구 시 상담신청 내역(신규)으로 이동"
          total={endedConsultationsState.meta.total}
          page={endedConsultationsState.meta.page}
          totalPages={endedConsultationsState.meta.totalPages}
          displayCount={endedConsultationsState.items.length}
        >
          <AdminEndedConsultationsTable
            leads={endedConsultationsState.items}
            loading={endedConsultationsState.loading}
            loadError={endedConsultationsState.error}
            total={endedConsultationsState.meta.total}
            page={endedConsultationsState.meta.page}
            totalPages={endedConsultationsState.meta.totalPages}
            searchQuery={endedConsultationsState.searchDraft}
            onSearchQueryChange={(value) =>
              setEndedConsultationsState((prev) => ({ ...prev, searchDraft: value }))
            }
            onSearch={() => {
              void loadEndedConsultations(1, endedConsultationsState.searchDraft.trim());
            }}
            onPageChange={(page) => {
              void loadEndedConsultations(page, endedConsultationsState.searchApplied);
            }}
            onRestore={restoreConsultation}
            onUpdateMemo={(lead, admin_memo) => updateLead(lead, { admin_memo })}
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="서비스 종료 고객"
          subtitle="가입 후 서비스가 종료된 고객 DB"
          total={endedSubscribersState.meta.total}
          page={endedSubscribersState.meta.page}
          totalPages={endedSubscribersState.meta.totalPages}
          displayCount={endedSubscribersState.items.length}
        >
          <AdminEndedSubscribersTable
            endedSubscribers={endedSubscribersState.items}
            loading={endedSubscribersState.loading}
            loadError={endedSubscribersState.error}
            migrationRequired={endedMigrationRequired}
            total={endedSubscribersState.meta.total}
            page={endedSubscribersState.meta.page}
            totalPages={endedSubscribersState.meta.totalPages}
            searchQuery={endedSubscribersState.searchDraft}
            onSearchQueryChange={(value) =>
              setEndedSubscribersState((prev) => ({ ...prev, searchDraft: value }))
            }
            onSearch={() => {
              void loadEndedSubscribers(1, endedSubscribersState.searchDraft.trim());
            }}
            onPageChange={(page) => {
              void loadEndedSubscribers(page, endedSubscribersState.searchApplied);
            }}
          />
        </AdminSectionCard>
      </div>
    </main>
  );
}
