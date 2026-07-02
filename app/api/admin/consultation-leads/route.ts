import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';
import {
  CONSULTATION_LEADS_TABLE,
  resolveConsultationLeadSelectFields,
} from '@/lib/admin/consultation-leads-query';
import {
  buildListMeta,
  leadSearchOrFilter,
  parseListQuery,
} from '@/lib/admin/list-query';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  CONSULTATION_LEAD_ACTIVE_STATUSES,
  CONSULTATION_LEAD_ENDED_STATUS,
  normalizeConsultationLeadStatus,
  type ConsultationLeadRow,
} from '@/types/consultation-lead';

/** DB 마이그레이션 전 레거시 status — 상담신청 내역에 포함 */
const LEGACY_ACTIVE_STATUSES = ['상담완료', '부재', '보류'] as const;
const LEGACY_ENDED_STATUSES = ['계약완료'] as const;

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, from, to, q, includeAll } = parseListQuery(searchParams);
  const section = searchParams.get('section') ?? 'active';

  try {
    const supabase = getSupabaseAdminClient();
    const { selectFields } = await resolveConsultationLeadSelectFields(supabase);

    let query = supabase.from(CONSULTATION_LEADS_TABLE).select(selectFields, { count: 'exact' });

    if (!includeAll) {
      if (section === 'ended_consultation') {
        query = query.in('status', [CONSULTATION_LEAD_ENDED_STATUS, ...LEGACY_ENDED_STATUSES]);
      } else {
        query = query.in('status', [...CONSULTATION_LEAD_ACTIVE_STATUSES, ...LEGACY_ACTIVE_STATUSES]);
      }
    }

    const searchFilter = leadSearchOrFilter(q);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    query = query.order('created_at', { ascending: false });

    if (!includeAll) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin/consultation-leads] list failed', error);
      return NextResponse.json(
        { success: false, message: '상담신청 내역을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    const leads: ConsultationLeadRow[] = ((data as unknown as ConsultationLeadRow[]) ?? []).map((lead) => ({
      ...lead,
      status: normalizeConsultationLeadStatus(lead.status),
    }));

    const total = count ?? leads.length;
    const meta = buildListMeta(total, includeAll ? 1 : page, includeAll ? total || 1 : pageSize);

    return NextResponse.json({
      success: true,
      leads,
      ...meta,
    });
  } catch (error) {
    console.error('[admin/consultation-leads] GET threw', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)',
      },
      { status: 503 },
    );
  }
}
