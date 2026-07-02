import { NextResponse } from 'next/server';
import {
  ENDED_SUBSCRIBER_SELECT,
  ENDED_SUBSCRIBERS_TABLE,
  isMissingTableError,
} from '@/lib/admin/subscribers-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import {
  buildListMeta,
  parseListQuery,
  subscriberSearchOrFilter,
} from '@/lib/admin/list-query';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { EndedSubscriberRow } from '@/types/subscriber';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, from, to, q, includeAll } = parseListQuery(searchParams);

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from(ENDED_SUBSCRIBERS_TABLE)
      .select(ENDED_SUBSCRIBER_SELECT, { count: 'exact' })
      .order('ended_at', { ascending: false });

    const searchFilter = subscriberSearchOrFilter(q);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    if (!includeAll) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      if (isMissingTableError(error, ENDED_SUBSCRIBERS_TABLE)) {
        return NextResponse.json({
          success: true,
          endedSubscribers: [],
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1,
          migrationRequired: true,
        });
      }
      console.error('[admin/ended-subscribers] list failed', error);
      return NextResponse.json(
        { success: false, message: '서비스 종료 고객 목록을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const meta = buildListMeta(total, includeAll ? 1 : page, includeAll ? total || 1 : pageSize);

    return NextResponse.json({
      success: true,
      endedSubscribers: (data as EndedSubscriberRow[]) ?? [],
      migrationRequired: false,
      ...meta,
    });
  } catch (error) {
    console.error('[admin/ended-subscribers] GET threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
