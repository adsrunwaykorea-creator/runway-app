import { NextResponse } from 'next/server';
import {
  SUBSCRIBER_SELECT,
  SUBSCRIBERS_TABLE,
  isMissingTableError,
} from '@/lib/admin/subscribers-query';
import { requireAdminUser } from '@/lib/admin/require-admin';
import {
  buildListMeta,
  parseListQuery,
  subscriberSearchOrFilter,
} from '@/lib/admin/list-query';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { SubscriberRow } from '@/types/subscriber';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, from, to, q, includeAll } = parseListQuery(searchParams);

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from(SUBSCRIBERS_TABLE)
      .select(SUBSCRIBER_SELECT, { count: 'exact' })
      .order('service_start_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const searchFilter = subscriberSearchOrFilter(q);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    if (!includeAll) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      if (isMissingTableError(error, SUBSCRIBERS_TABLE)) {
        return NextResponse.json({
          success: true,
          subscribers: [],
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1,
          migrationRequired: true,
        });
      }
      console.error('[admin/subscribers] list failed', error);
      return NextResponse.json(
        { success: false, message: '가입자 명단을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const meta = buildListMeta(total, includeAll ? 1 : page, includeAll ? total || 1 : pageSize);

    return NextResponse.json({
      success: true,
      subscribers: (data as SubscriberRow[]) ?? [],
      migrationRequired: false,
      ...meta,
    });
  } catch (error) {
    console.error('[admin/subscribers] GET threw', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 503 });
  }
}
