import { NextResponse } from 'next/server';
import {
  CONSULTATION_LEADS_TABLE,
  resolveConsultationLeadSelectFields,
} from '@/lib/admin/consultation-leads-query';
import {
  extractSupabaseError,
  isCheckConstraintViolation,
  logSupabaseError,
} from '@/lib/admin/supabase-error';
import { requireAdminUser } from '@/lib/admin/require-admin';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  CONSULTATION_LEAD_ENDED_STATUS,
  CONSULTATION_LEAD_MANUAL_STATUSES,
  CONSULTATION_LEAD_REGISTERED_STATUS,
  denormalizeConsultationLeadStatusForDb,
} from '@/types/consultation-lead';

type PatchBody = {
  status?: unknown;
  admin_memo?: unknown;
  message?: unknown;
  payment_status?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const STATUS_MIGRATION_HINT =
  'supabase/sql/026_consultation_status_overhaul.sql 을 Supabase SQL Editor에서 실행해 주세요.';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id: rawId } = await context.params;
  const id = str(rawId);
  if (!id) {
    return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch (error) {
    console.error('[admin/consultation-leads/:id] invalid JSON', error);
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const nextStatus = body.status !== undefined ? str(body.status) : undefined;

  const updates: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    if (nextStatus === CONSULTATION_LEAD_REGISTERED_STATUS || nextStatus === '가입완료') {
      return NextResponse.json(
        { success: false, message: '가입자 등록 완료 처리는 "가입자 등록" 버튼을 사용해 주세요.' },
        { status: 400 },
      );
    }

    const allowedStatuses = [...CONSULTATION_LEAD_MANUAL_STATUSES, CONSULTATION_LEAD_ENDED_STATUS];
    if (!allowedStatuses.includes(nextStatus as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ success: false, message: '처리상태 값이 올바르지 않습니다.' }, { status: 400 });
    }
    updates.status = nextStatus!;
  }

  if (body.admin_memo !== undefined) {
    updates.admin_memo = str(body.admin_memo);
  }

  if (body.message !== undefined) {
    updates.message = str(body.message);
  }

  if (body.payment_status !== undefined) {
    updates.payment_status = str(body.payment_status) || null;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, message: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { selectFields, hasPaymentStatusColumn } = await resolveConsultationLeadSelectFields(supabase);

    if (!hasPaymentStatusColumn && body.payment_status !== undefined) {
      delete updates.payment_status;
    }

    const { data: existingLead, error: existingError } = await supabase
      .from(CONSULTATION_LEADS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      const dbError = logSupabaseError('[admin/consultation-leads/:id] lookup failed', existingError, {
        table: CONSULTATION_LEADS_TABLE,
        id,
      });
      return NextResponse.json(
        {
          success: false,
          message: '상담신청 정보를 조회하지 못했습니다.',
          error: dbError,
        },
        { status: 500 },
      );
    }

    if (!existingLead) {
      return NextResponse.json({ success: false, message: '상담신청 내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    const performUpdate = async (payload: Record<string, string | number | null>) =>
      supabase.from(CONSULTATION_LEADS_TABLE).update(payload).eq('id', id);

    let { error: updateError } = await performUpdate(updates);

    if (updateError && isCheckConstraintViolation(updateError) && typeof updates.status === 'string') {
      const legacyStatus = denormalizeConsultationLeadStatusForDb(updates.status);
      if (legacyStatus !== updates.status) {
        console.warn('[admin/consultation-leads/:id] retrying with legacy status', {
          id,
          requestedStatus: updates.status,
          legacyStatus,
        });
        ({ error: updateError } = await performUpdate({ ...updates, status: legacyStatus }));
      }
    }

    if (updateError) {
      const dbError = logSupabaseError('[admin/consultation-leads/:id] update failed', updateError, {
        table: CONSULTATION_LEADS_TABLE,
        id,
        updates,
      });
      const hint =
        isCheckConstraintViolation(updateError)
          ? `status 값이 DB 제약 조건과 맞지 않습니다. ${STATUS_MIGRATION_HINT}`
          : dbError.hint;
      return NextResponse.json(
        {
          success: false,
          message: '상담신청 정보를 저장하지 못했습니다.',
          error: { ...dbError, hint },
        },
        { status: 500 },
      );
    }

    const { data, error: selectError } = await supabase
      .from(CONSULTATION_LEADS_TABLE)
      .select(selectFields)
      .eq('id', id)
      .maybeSingle();

    if (selectError) {
      logSupabaseError('[admin/consultation-leads/:id] select after update failed', selectError, { id });
    }

    return NextResponse.json({ success: true, lead: data ?? { ...existingLead, ...updates } });
  } catch (error) {
    console.error('[admin/consultation-leads/:id] PATCH threw', error);
    return NextResponse.json(
      { success: false, message: '서버 설정을 확인해 주세요. (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    );
  }
}
