'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getOrderStatus, type OrderStatus } from '@/lib/status';
import { formatDate } from '@/lib/date';
import type { OrderRow } from '@/types/order';

type AdminOrderItem = Omit<OrderRow, 'email' | 'service' | 'period'> & {
  email: string | null;
  service: string;
  period: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

type AdminOrderView = AdminOrderItem & {
  profile: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

const getExpiryStatusMeta = (status: OrderStatus) => {
  if (status === '만료') {
    return {
      label: '만료',
      className: 'bg-red-100 text-red-700 border border-red-200',
    };
  }
  if (status === '긴급') {
    return {
      label: '긴급',
      className: 'bg-orange-100 text-orange-800 border border-orange-300',
    };
  }
  if (status === '곧 만료') {
    return {
      label: '곧 만료',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }
  return {
    label: '진행중',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrderView[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const loadOrders = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (!cancelled) router.replace('/login');
        return;
      }

      const { data: orderRows, error: orderError } = await supabase
        .from('orders')
        .select(
          'id, user_id, email, guest_name, guest_phone, business_name, confirmation_channel, service, period, amount, price, created_at, expires_at'
        )
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('[ADMIN_ORDERS_LOAD_ERROR]', orderError);
      }

      const baseOrders = (orderRows as AdminOrderItem[] | null) ?? [];
      const userIds = Array.from(
        new Set(baseOrders.map((order) => order.user_id).filter((userId): userId is string => Boolean(userId))),
      );

      let profileById = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, phone, email')
          .in('id', userIds);

        if (profileError) {
          console.error('[ADMIN_PROFILES_LOAD_ERROR]', profileError);
        } else {
          profileById = new Map((profileRows as ProfileRow[]).map((row) => [row.id, row]));
        }
      }

      const merged = baseOrders.map((order) => {
        const profile = order.user_id ? profileById.get(order.user_id) : undefined;
        return {
          ...order,
          profile: profile
            ? {
                name: profile.name ?? null,
                phone: profile.phone ?? null,
                email: profile.email ?? null,
              }
            : null,
        };
      });

      if (!cancelled) {
        setOrders(merged);
        setLoading(false);
      }
    };

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const formatPrice = (value: number) => `₩${value.toLocaleString('ko-KR')}`;

  const { thisMonthRevenue, thisMonthOrderCount } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const thisMonthOrders = orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= thisMonthStart && createdAt < nextMonthStart;
    });

    return {
      thisMonthRevenue: thisMonthOrders.reduce(
        (sum, order) => sum + (order.amount ?? order.price ?? 0),
        0
      ),
      thisMonthOrderCount: thisMonthOrders.length,
    };
  }, [orders]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-4 sm:p-6">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900">관리자 페이지</h1>
        <p className="mb-6 text-sm text-zinc-600">최근 결제 내역을 최신순으로 확인할 수 있습니다.</p>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700">이번 달 매출</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-900">{formatPrice(thisMonthRevenue)}</p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">이번 달 주문 수</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-900">{thisMonthOrderCount}</p>
          </article>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">결제 데이터를 불러오는 중...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            저장된 결제 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const expiryStatus = getOrderStatus(order.expires_at);
              const statusMeta = getExpiryStatusMeta(expiryStatus);

              return (
                <article
                  key={order.id}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold break-all text-slate-900">
                      {order.email ?? order.guest_name ?? '비회원 주문'}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="mt-1">
                    <span className="font-semibold">고객명</span>:{' '}
                    {order.profile?.name ?? order.guest_name ?? '-'}
                  </p>
                  <p>
                    <span className="font-semibold">전화번호</span>:{' '}
                    {order.profile?.phone ?? order.guest_phone ?? '-'}
                  </p>
                  <p>
                    <span className="font-semibold">주문 유형</span>:{' '}
                    {order.user_id ? '회원 결제' : '비회원 결제'}
                  </p>
                  <p>
                    <span className="font-semibold">이메일</span>: {order.profile?.email ?? order.email ?? '-'}
                  </p>
                  <p>
                    <span className="font-semibold">서비스</span>: {order.service}
                  </p>
                  <p>
                    <span className="font-semibold">기간</span>: {order.period}
                  </p>
                  <p>
                    <span className="font-semibold">결제금액</span>:{' '}
                    {formatPrice(order.amount ?? order.price ?? 0)}
                  </p>
                  <p>
                    <span className="font-semibold">결제일</span>: {formatDate(order.created_at)}
                  </p>
                  <p>
                    <span className="font-semibold">마감일</span>: {formatDate(order.expires_at)}
                  </p>
                  <p>
                    <span className="font-semibold">상태</span>: {expiryStatus}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
