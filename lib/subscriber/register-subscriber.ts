import {
  buildDefaultRecoverInput,
  fetchOrphanConsultationLeads,
  type OrphanLeadRow,
} from '@/lib/subscriber/orphan-subscribers';
import { CONSULTATION_LEADS_TABLE } from '@/lib/admin/consultation-leads-query';
import { SUBSCRIBERS_TABLE } from '@/lib/admin/subscribers-query';
import { computeSuggestedServiceStatus } from '@/lib/subscriber/subscriber-constants';
import { isMissingTableError } from '@/lib/payment/payment-schema';
import type { RegisterSubscriberInput } from '@/types/consultation-lead';
import { CONSULTATION_LEAD_REGISTERED_STATUS } from '@/types/consultation-lead';
import type { SupabaseClient } from '@supabase/supabase-js';

type LeadRow = {
  id: string;
  lead_name: string | null;
  phone: string | null;
  company: string | null;
  company_name: string | null;
  business_type: string | null;
  admin_memo: string | null;
};

function leadName(lead: LeadRow): string {
  return lead.lead_name?.trim() || lead.phone?.trim() || '고객';
}

function leadPhone(lead: LeadRow): string {
  return lead.phone?.trim() || '-';
}

function leadCompany(lead: LeadRow): string | null {
  return lead.company_name?.trim() || lead.company?.trim() || null;
}

export async function registerSubscriberFromConsultation(
  supabase: SupabaseClient,
  consultationId: string,
  input: RegisterSubscriberInput,
): Promise<{ subscriberId: string }> {
  const tableProbe = await supabase.from(SUBSCRIBERS_TABLE).select('id').limit(1);
  if (tableProbe.error && isMissingTableError(tableProbe.error, SUBSCRIBERS_TABLE)) {
    throw new Error('subscribers 테이블이 없습니다. supabase/sql/023_subscribers_and_ended.sql 을 실행해 주세요.');
  }

  const { data: lead, error: leadError } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('*')
    .eq('id', consultationId)
    .maybeSingle();

  if (leadError || !lead) {
    console.error('[registerSubscriber] consultation not found', {
      table: CONSULTATION_LEADS_TABLE,
      consultationId,
      error: leadError,
    });
    throw new Error('상담신청 내역을 찾을 수 없습니다.');
  }

  const leadRow = lead as LeadRow;
  const serviceStatus = computeSuggestedServiceStatus(input.service_end_date, '진행중');
  const now = new Date().toISOString();

  const { data: existingSubscriber, error: existingError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select('id')
    .eq('consultation_id', consultationId)
    .maybeSingle();

  if (existingError) {
    console.error('[registerSubscriber] existing lookup failed', existingError);
    throw new Error('가입자 중복 확인에 실패했습니다.');
  }

  if (existingSubscriber?.id) {
    throw new Error('이미 subscribers 테이블에 등록된 가입자입니다.');
  }

  const { data: subscriber, error: insertError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .insert({
      consultation_id: consultationId,
      name: leadName(leadRow),
      phone: leadPhone(leadRow),
      company: leadCompany(leadRow),
      business_type: leadRow.business_type,
      product_name: input.product_name,
      payment_method: input.payment_method,
      payment_amount: input.payment_amount,
      paid_at: input.paid_at,
      service_start_date: input.service_start_date,
      service_end_date: input.service_end_date,
      service_status: serviceStatus,
      admin_memo: input.admin_memo ?? leadRow.admin_memo,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !subscriber) {
    console.error('[registerSubscriber] insert failed', {
      table: SUBSCRIBERS_TABLE,
      consultationId,
      error: insertError,
    });
    const detail = insertError?.message ? ` (${insertError.message})` : '';
    throw new Error(`가입자 등록에 실패했습니다.${detail}`);
  }

  const { error: leadUpdateError } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .update({
      status: CONSULTATION_LEAD_REGISTERED_STATUS,
      admin_memo: input.admin_memo ?? leadRow.admin_memo,
      updated_at: now,
    })
    .eq('id', consultationId);

  if (leadUpdateError) {
    console.error('[registerSubscriber] consultation status update failed', leadUpdateError);
    await supabase.from(SUBSCRIBERS_TABLE).delete().eq('id', subscriber.id);
    throw new Error(
      'subscribers 등록 후 상담 상태 변경에 실패했습니다. 가입자 등록이 취소되었으니 다시 시도해 주세요.',
    );
  }

  return { subscriberId: subscriber.id as string };
}

export async function endSubscriberService(
  supabase: SupabaseClient,
  subscriberId: string,
  options?: { endReason?: string; adminMemo?: string },
): Promise<{ endedId: string }> {
  const { ENDED_SUBSCRIBERS_TABLE } = await import('@/lib/admin/subscribers-query');

  const { data: subscriber, error: lookupError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select('*')
    .eq('id', subscriberId)
    .maybeSingle();

  if (lookupError || !subscriber) {
    throw new Error('가입자를 찾을 수 없습니다.');
  }

  const now = new Date().toISOString();
  const endReason = options?.endReason?.trim() || '서비스 종료';

  const { data: ended, error: endedError } = await supabase
    .from(ENDED_SUBSCRIBERS_TABLE)
    .insert({
      subscriber_id: subscriberId,
      consultation_id: subscriber.consultation_id,
      name: subscriber.name,
      phone: subscriber.phone,
      company: subscriber.company,
      business_type: subscriber.business_type,
      product_name: subscriber.product_name,
      payment_amount: subscriber.payment_amount,
      service_start_date: subscriber.service_start_date,
      service_end_date: subscriber.service_end_date ?? now,
      ended_at: now,
      end_reason: endReason,
      admin_memo: options?.adminMemo ?? subscriber.admin_memo,
    })
    .select('id')
    .single();

  if (endedError || !ended) {
    console.error('[endSubscriberService] insert ended_subscribers failed', endedError);
    throw new Error('서비스 종료 처리에 실패했습니다.');
  }

  const { error: deleteError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .delete()
    .eq('id', subscriberId);

  if (deleteError) {
    console.error('[endSubscriberService] delete subscriber failed', deleteError);
    throw new Error('서비스 종료 후 가입자 삭제에 실패했습니다.');
  }

  return { endedId: ended.id as string };
}

export async function rejoinEndedSubscriber(
  supabase: SupabaseClient,
  endedId: string,
  options?: {
    product_name?: string;
    payment_method?: string;
    payment_amount?: number;
    paid_at?: string;
    service_start_date?: string;
    service_end_date?: string;
    admin_memo?: string;
  },
): Promise<{ subscriberId: string }> {
  const { ENDED_SUBSCRIBERS_TABLE } = await import('@/lib/admin/subscribers-query');

  const { data: ended, error: lookupError } = await supabase
    .from(ENDED_SUBSCRIBERS_TABLE)
    .select('*')
    .eq('id', endedId)
    .maybeSingle();

  if (lookupError || !ended) {
    throw new Error('서비스 종료 고객을 찾을 수 없습니다.');
  }

  const now = new Date().toISOString();
  const serviceEnd = options?.service_end_date ?? ended.service_end_date ?? now;
  const serviceStatus = computeSuggestedServiceStatus(String(serviceEnd), '진행중');

  const { data: subscriber, error: insertError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .insert({
      consultation_id: ended.consultation_id,
      name: ended.name,
      phone: ended.phone,
      company: ended.company,
      business_type: ended.business_type,
      product_name: options?.product_name ?? ended.product_name,
      payment_method: options?.payment_method ?? 'bank_transfer',
      payment_amount: options?.payment_amount ?? ended.payment_amount,
      paid_at: options?.paid_at ?? now,
      service_start_date: options?.service_start_date ?? ended.service_start_date ?? now,
      service_end_date: serviceEnd,
      service_status: serviceStatus,
      admin_memo: options?.admin_memo ?? ended.admin_memo,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !subscriber) {
    throw new Error('재가입 처리에 실패했습니다.');
  }

  if (ended.consultation_id) {
    await supabase
      .from(CONSULTATION_LEADS_TABLE)
      .update({ status: CONSULTATION_LEAD_REGISTERED_STATUS, updated_at: now })
      .eq('id', ended.consultation_id);
  }

  return { subscriberId: subscriber.id as string };
}

export async function createRenewalRequest(
  supabase: SupabaseClient,
  subscriberId: string,
): Promise<void> {
  const { data: subscriber, error } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select('id, admin_memo')
    .eq('id', subscriberId)
    .maybeSingle();

  if (error || !subscriber) {
    throw new Error('가입자를 찾을 수 없습니다.');
  }

  await supabase
    .from(SUBSCRIBERS_TABLE)
    .update({
      service_status: '재결제요청',
      admin_memo: subscriber.admin_memo ?? '재결제 요청',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriberId);
}

export async function recoverOrphanSubscriber(
  supabase: SupabaseClient,
  consultationId: string,
): Promise<{ subscriberId: string }> {
  const { data: lead, error: leadError } = await supabase
    .from(CONSULTATION_LEADS_TABLE)
    .select('*')
    .eq('id', consultationId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error('복구할 상담신청 내역을 찾을 수 없습니다.');
  }

  const input = buildDefaultRecoverInput(lead as OrphanLeadRow);
  return registerSubscriberFromConsultation(supabase, consultationId, input);
}

export type RecoverOrphansResult = {
  recovered: number;
  failed: Array<{ consultationId: string; message: string }>;
};

export async function recoverAllOrphanSubscribers(
  supabase: SupabaseClient,
): Promise<RecoverOrphansResult> {
  const { data: subscribers, error: subsError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select('consultation_id');

  if (subsError) {
    throw new Error('가입자 목록 조회에 실패했습니다.');
  }

  const subscribedIds = new Set<string>(
    (subscribers ?? [])
      .map((row) => row.consultation_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  const orphans = await fetchOrphanConsultationLeads(supabase, subscribedIds);
  const result: RecoverOrphansResult = { recovered: 0, failed: [] };

  for (const lead of orphans) {
    try {
      await recoverOrphanSubscriber(supabase, lead.id);
      result.recovered += 1;
    } catch (error) {
      result.failed.push({
        consultationId: lead.id,
        message: error instanceof Error ? error.message : '복구 실패',
      });
    }
  }

  return result;
}
