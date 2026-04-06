'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getOrderStatus, type OrderStatus } from '@/lib/status';
import { getListPriceForOrder, renewalExtraDiscountPercent } from '@/lib/pricing';

type UserSummary = {
  id: string;
  email: string;
  provider: string;
  name: string;
  phone: string;
};

type OrderHistoryItem = {
  id: string;
  service: string;
  service_key?: string | null;
  period: string;
  price: number;
  created_at: string;
  expires_at: string | null;
};

export default function MyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        if (!cancelled) router.replace('/login');
        return;
      }

      const user = data.user;
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('provider, name, phone')
        .eq('id', user.id)
        .maybeSingle();

      const provider =
        profileRow?.provider ??
        user.app_metadata?.provider ??
        user.identities?.[0]?.provider ??
        'kakao';

      const { data: ordersRows } = await supabase
        .from('orders')
        .select('id, service, service_key, period, price, created_at, expires_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setUserSummary({
          id: user.id,
          email: user.email ?? '-',
          provider,
          name: profileRow?.name ?? '',
          phone: profileRow?.phone ?? '',
        });
        setProfileForm({
          name: profileRow?.name ?? '',
          phone: profileRow?.phone ?? '',
        });
        setOrders((ordersRows as OrderHistoryItem[] | null) ?? []);
        setLoading(false);
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleSaveProfile = async () => {
    setSaveMessage(null);
    setSaveLoading(true);
    const supabase = getSupabaseBrowserClient();

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setSaveMessage({ type: 'error', text: '로그인 정보를 확인할 수 없습니다.' });
        setSaveLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: profileForm.name.trim() || null,
          phone: profileForm.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('[MYPAGE_PROFILE_UPDATE_ERROR]', updateError);
        setSaveMessage({ type: 'error', text: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' });
        setSaveLoading(false);
        return;
      }

      setUserSummary((prev) =>
        prev
          ? {
              ...prev,
              name: profileForm.name,
              phone: profileForm.phone,
            }
          : prev
      );
      setSaveMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
      const rawNext = searchParams.get('next');
      const safeNext =
        rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
      if (safeNext) {
        router.replace(safeNext);
      }
    } catch (saveError) {
      console.error('[MYPAGE_PROFILE_SAVE_ERROR]', saveError);
      setSaveMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const formatPrice = (value: number) => `₩${value.toLocaleString('ko-KR')}`;
  const formatPeriod = (period: string) => {
    if (period === 'monthly') return '월 단위';
    if (period === 'quarterly') return '3개월';
    return period;
  };
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  const getStatusMeta = (status: OrderStatus) => {
    if (status === '진행중') {
      return {
        label: '진행중',
        className: 'bg-blue-100 text-blue-700 border border-blue-200',
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
      label: '만료',
      className: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
    };
  };

  const getStatusGuide = (status: OrderStatus) => {
    if (status === '진행중') {
      return ['현재 서비스가 진행 중입니다.'];
    }
    if (status === '긴급') {
      return ['만료 임박 — 지금 연장을 권장합니다'];
    }
    if (status === '곧 만료') {
      return ['이용 기간이 얼마 남지 않았습니다'];
    }
    return ['이용 기간이 종료되었습니다'];
  };

  const showExtensionBenefitCopy = (status: OrderStatus) =>
    status === '진행중' || status === '곧 만료' || status === '긴급';

  const buildRenewPaymentHref = (order: OrderHistoryItem, status: OrderStatus) => {
    const params = new URLSearchParams({
      renew: 'true',
      period: order.period,
      service: order.service,
    });
    if (status === '긴급') {
      params.set('urgent', 'true');
    }
    return `/payment?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900">마이페이지</h1>
        <p className="mb-1 text-sm font-semibold text-slate-700">
          환영합니다, {userSummary?.email ?? '고객님'}님
        </p>
        <p className="mb-6 text-sm text-zinc-600">현재 로그인한 사용자 정보입니다.</p>

        {loading ? (
          <p className="text-sm text-zinc-500">사용자 정보를 불러오는 중...</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 text-sm text-slate-800">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="font-semibold">이메일</span>
                <p className="mt-1 break-all">{userSummary?.email}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="font-semibold">provider</span>
                <p className="mt-1">{userSummary?.provider}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="font-semibold">user id</span>
                <p className="mt-1 break-all">{userSummary?.id}</p>
              </div>
            </div>

            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-base font-bold text-slate-900">내 정보 확인(필수)</h2>
              <p className="mb-3 mt-1 text-xs text-zinc-600">
                서비스 이용을 위해 이름과 전화번호를 정확히 입력해주세요.
              </p>
              <div className="space-y-3">
                <div>
                  <label htmlFor="profile-name" className="mb-1 block text-xs font-semibold text-zinc-600">
                    이름
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="이름을 입력해주세요"
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="mb-1 block text-xs font-semibold text-zinc-600">
                    전화번호
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="전화번호를 입력해주세요"
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-zinc-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={saveLoading}
                  className="h-11 w-full rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {saveLoading ? '저장 중...' : '정보 저장하기'}
                </button>
                {saveMessage ? (
                  <p
                    className={`text-xs font-semibold ${
                      saveMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {saveMessage.text}
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">내 결제 내역</h2>
              {orders.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                  결제 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const serviceStatus = getOrderStatus(order.expires_at);
                    const statusMeta = getStatusMeta(serviceStatus);
                    const guides = getStatusGuide(serviceStatus);
                    const sk =
                      order.service_key === 'sns' || order.service_key === 'db'
                        ? order.service_key
                        : order.service.includes('DB')
                          ? 'db'
                          : order.service.includes('SNS')
                            ? 'sns'
                            : null;
                    const listPrice =
                      sk && (order.period === 'monthly' || order.period === 'quarterly')
                        ? getListPriceForOrder(sk, order.period)
                        : null;
                    return (
                    <article
                      key={order.id}
                      className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="pr-1 text-base font-bold text-slate-900">{order.service}</p>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                            {guides.map((guide, index) => (
                              <span key={`${order.id}-guide-${index}`}>
                                {guide}
                                {index < guides.length - 1 ? <br /> : null}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1">
                        <span className="font-semibold">이용 기간</span>: {formatPeriod(order.period)}
                      </p>
                      <p>
                        <span className="font-semibold">결제 금액</span>: {formatPrice(order.price)}
                      </p>
                      {listPrice != null && listPrice > order.price ? (
                        <p className="text-xs text-zinc-400">
                          <span className="line-through">정가 {formatPrice(listPrice)}</span>
                          <span className="ml-2 text-zinc-500">(할인 적용가로 결제)</span>
                        </p>
                      ) : null}
                      <p>
                        <span className="font-semibold">결제일</span>: {formatDate(order.created_at)}
                      </p>
                      <p>
                        <span className="font-semibold">만료일</span>: {order.expires_at ? formatDate(order.expires_at) : '-'}
                      </p>
                      <div
                        className={`mt-4 pt-3 ${
                          serviceStatus === '긴급'
                            ? 'rounded-lg border border-red-200 bg-red-50/80 p-3'
                            : showExtensionBenefitCopy(serviceStatus)
                              ? 'rounded-lg border border-emerald-200 bg-emerald-50/60 p-3'
                              : 'border-t border-zinc-100'
                        }`}
                      >
                        {showExtensionBenefitCopy(serviceStatus) ? (
                          <div className="space-y-1.5">
                            {serviceStatus === '긴급' ? (
                              <>
                                <p className="text-xs font-bold leading-snug text-red-800">
                                  곧 서비스 종료 — 1개월 긴급 할인 또는 3개월 연장을 선택하세요
                                </p>
                                <p className="text-[11px] font-semibold leading-snug text-red-700/90">
                                  3개월: 타이머 내 혜택 유지 · 4개월 이용(1개월 추가 제공)
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-semibold leading-snug text-emerald-900">
                                  지금 연장하면 추가 {renewalExtraDiscountPercent}% 할인
                                </p>
                                <p className="text-[11px] font-medium leading-snug text-emerald-800/90">
                                  3개월 연장 시 4개월 이용 (1개월 추가 제공) — 권장
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-semibold leading-snug text-zinc-700">
                            만료된 서비스는 재구매로 이어갈 수 있습니다
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(buildRenewPaymentHref(order, serviceStatus))}
                          className={`mt-2 h-10 w-full rounded-lg text-xs font-bold text-white transition ${
                            serviceStatus === '긴급'
                              ? 'bg-red-600 hover:bg-red-700'
                              : serviceStatus === '만료'
                                ? 'bg-zinc-800 hover:bg-zinc-900'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {serviceStatus === '만료' ? '지금 재구매하기' : '지금 연장하기'}
                        </button>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 h-11 w-full rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          로그아웃
        </button>
      </div>
    </main>
  );
}
