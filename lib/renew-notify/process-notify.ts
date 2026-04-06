import type { SupabaseClient } from '@supabase/supabase-js';
import { KAKAO_TEMPLATE_CODES, type KakaoTemplateCode } from '@/lib/kakao/templateCodes';
import { sendAlimtalk } from '@/lib/solapi/send-alimtalk';

type OrderRow = {
  id: string;
  user_id: string | null;
  service: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  phone: string | null;
};

const CHUNK = 100;

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchProfilesByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (userIds.length === 0) return map;

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from('profiles').select('id, name, phone').in('id', chunk);

    if (error) {
      throw new Error(`[renew-notify] profiles query failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      const p = row as ProfileRow;
      map.set(p.id, p);
    }
  }
  return map;
}

async function updateNotifyFlags(
  supabase: SupabaseClient,
  column: 'notify_7d' | 'notify_3d' | 'notify_1d',
  orderIds: string[]
): Promise<void> {
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunk = orderIds.slice(i, i + CHUNK);
    const { error } = await supabase.from('orders').update({ [column]: true }).in('id', chunk);
    if (error) {
      throw new Error(`[renew-notify] orders update ${column} failed: ${error.message}`);
    }
  }
}

/**
 * D-7 구간 (3일 초과 ~ 7일 이내)
 * expires_at <= now()+7d, expires_at > now()+3d, notify_7d = false
 */
export async function process7Day(supabase: SupabaseClient): Promise<number> {
  return processNotifyTier(supabase, '[D-7]', 'notify_7d', { lteDays: 7, gtDays: 3 });
}

/**
 * D-3 구간 (1일 초과 ~ 3일 이내)
 * expires_at <= now()+3d, expires_at > now()+1d, notify_3d = false
 */
export async function process3Day(supabase: SupabaseClient): Promise<number> {
  return processNotifyTier(supabase, '[D-3]', 'notify_3d', { lteDays: 3, gtDays: 1 });
}

/**
 * D-1 구간 (만료 직전 ~ 1일 이내)
 * expires_at <= now()+1d, expires_at > now(), notify_1d = false
 */
export async function process1Day(supabase: SupabaseClient): Promise<number> {
  return processNotifyTier(supabase, '[D-1]', 'notify_1d', { lteDays: 1, gtDays: 0 });
}

type TierBounds = {
  /** expires_at <= now() + lteDays */
  lteDays: number;
  /** expires_at > now() + gtDays (0이면 아직 만료 전 구간의 하한) */
  gtDays: number;
};

type RenewAlimtalkContext = {
  from: string;
  pfId: string;
  templateCode: KakaoTemplateCode;
};

function templateCodeForTier(logPrefix: '[D-7]' | '[D-3]' | '[D-1]'): KakaoTemplateCode {
  switch (logPrefix) {
    case '[D-7]':
      return KAKAO_TEMPLATE_CODES.D7_EXPIRE_NOTICE;
    case '[D-3]':
      return KAKAO_TEMPLATE_CODES.D3_EXPIRE_NOTICE;
    default:
      return KAKAO_TEMPLATE_CODES.D1_EXPIRE_NOTICE;
  }
}

/** 환경 미설정 시 null — 해당 구간은 발송·카운트 0 (크론은 200 유지 가능) */
function trySolapiRenewEnv(logPrefix: '[D-7]' | '[D-3]' | '[D-1]'): RenewAlimtalkContext | null {
  if (!process.env.SOLAPI_API_KEY?.trim() || !process.env.SOLAPI_API_SECRET?.trim()) {
    console.error('[renew-notify] SOLAPI_API_KEY / SOLAPI_API_SECRET 없음 — 알림톡 건너뜀', logPrefix);
    return null;
  }
  const from = process.env.SOLAPI_FROM?.trim();
  const pfId = process.env.SOLAPI_KAKAO_PF_ID?.trim();
  const templateCode = templateCodeForTier(logPrefix);

  if (!from || !pfId) {
    console.error('[renew-notify] SOLAPI_FROM / SOLAPI_KAKAO_PF_ID 없음 — 알림톡 건너뜀', logPrefix, {
      hasFrom: Boolean(from),
      hasPfId: Boolean(pfId),
    });
    return null;
  }

  return { from, pfId, templateCode };
}

async function processNotifyTier(
  supabase: SupabaseClient,
  logPrefix: '[D-7]' | '[D-3]' | '[D-1]',
  notifyColumn: 'notify_7d' | 'notify_3d' | 'notify_1d',
  bounds: TierBounds
): Promise<number> {
  const lowerIso = addDaysIso(bounds.gtDays);
  const upperIso = addDaysIso(bounds.lteDays);

  const { data, error } = await supabase
    .from('orders')
    .select('id, user_id, service, expires_at')
    .eq(notifyColumn, false)
    .not('expires_at', 'is', null)
    .gt('expires_at', lowerIso)
    .lte('expires_at', upperIso);

  if (error) {
    throw new Error(`[renew-notify] orders query (${logPrefix}) failed: ${error.message}`);
  }

  const orders = (data ?? []) as OrderRow[];
  const userIds = [
    ...new Set(orders.map((o) => o.user_id).filter((id): id is string => Boolean(id))),
  ];
  const profileById = await fetchProfilesByUserIds(supabase, userIds);

  const alimCtx = trySolapiRenewEnv(logPrefix);
  if (!alimCtx) {
    return 0;
  }

  const toUpdate: string[] = [];

  for (const o of orders) {
    if (!o.user_id) {
      console.log('[renew-notify] user_id missing', { order_id: o.id, tier: logPrefix });
      continue;
    }

    const profile = profileById.get(o.user_id);
    if (!profile) {
      console.log('[renew-notify] profile not found', { user_id: o.user_id, order_id: o.id, tier: logPrefix });
      continue;
    }

    const phone = profile.phone?.trim() ?? '';
    if (!phone) {
      console.log('[renew-notify] phone_number missing', { user_id: o.user_id, order_id: o.id, tier: logPrefix });
      continue;
    }

    const name = profile.name?.trim() ?? '';
    const fallbackText = `${logPrefix} ${name} / ${phone} / ${o.service} / ${o.expires_at}`;

    try {
      await sendAlimtalk({
        to: phone,
        from: alimCtx.from,
        text: fallbackText,
        kakaoOptions: {
          pfId: alimCtx.pfId,
          templateId: alimCtx.templateCode,
          variables: {
            '#{고객명}': name || '고객',
            '#{서비스}': o.service,
            '#{만료일시}': o.expires_at,
            '#{알림구간}': logPrefix,
          },
        },
      });
      toUpdate.push(o.id);
    } catch {
      /* sendAlimtalk에서 이미 console.error */
    }
  }

  if (toUpdate.length > 0) {
    await updateNotifyFlags(supabase, notifyColumn, toUpdate);
  }

  return toUpdate.length;
}
