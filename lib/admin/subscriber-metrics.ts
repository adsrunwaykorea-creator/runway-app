import {
  getSubscriberPaymentDate,
  isExpiringWithinDaysKst,
  isKstDateInCurrentMonth,
} from '@/lib/date-kst';
import { ACTIVE_SUBSCRIBER_STATUSES } from '@/lib/subscriber/subscriber-constants';
import type { ConsultationLeadRow } from '@/types/consultation-lead';
import type { SubscriberRow } from '@/types/subscriber';

export type AdminDashboardMetrics = {
  thisMonthRevenue: number;
  thisMonthSubscriberCount: number;
  thisMonthLeadCount: number;
  activeSubscriberCount: number;
  expiringSoonCount: number;
  expiringThisMonthCount: number;
  endedCount: number;
};

function isActiveSubscriber(row: SubscriberRow): boolean {
  if (!row.service_status) return true;
  return (ACTIVE_SUBSCRIBER_STATUSES as readonly string[]).includes(row.service_status);
}

export function computeAdminDashboardMetrics(
  subscribers: SubscriberRow[],
  leads: ConsultationLeadRow[],
  endedCount: number,
  baseDate: Date = new Date(),
): AdminDashboardMetrics {
  const activeSubscribers = subscribers.filter(isActiveSubscriber);

  const thisMonthRevenue = activeSubscribers.reduce((sum, row) => {
    const paymentDate = getSubscriberPaymentDate(row);
    if (!paymentDate || !isKstDateInCurrentMonth(paymentDate, baseDate)) return sum;
    if (!row.payment_amount || row.payment_amount <= 0) return sum;
    return sum + row.payment_amount;
  }, 0);

  const thisMonthSubscriberCount = activeSubscribers.filter((row) =>
    isKstDateInCurrentMonth(row.service_start_date, baseDate),
  ).length;

  const thisMonthLeadCount = leads.filter((lead) =>
    isKstDateInCurrentMonth(lead.created_at, baseDate),
  ).length;

  const expiringSoonCount = activeSubscribers.filter((row) =>
    isExpiringWithinDaysKst(row.service_end_date, 7, baseDate),
  ).length;

  const expiringThisMonthCount = activeSubscribers.filter((row) =>
    isKstDateInCurrentMonth(row.service_end_date, baseDate),
  ).length;

  return {
    thisMonthRevenue,
    thisMonthSubscriberCount,
    thisMonthLeadCount,
    activeSubscriberCount: activeSubscribers.length,
    expiringSoonCount,
    expiringThisMonthCount,
    endedCount,
  };
}
