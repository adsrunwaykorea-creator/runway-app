const KST_TIMEZONE = 'Asia/Seoul';

export type KstYmd = {
  year: number;
  month: number;
  day: number;
};

function ymdFromParts(parts: Intl.DateTimeFormatPart[]): KstYmd {
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

export function getKstYmd(date: Date = new Date()): KstYmd {
  return ymdFromParts(
    new Intl.DateTimeFormat('en-US', {
      timeZone: KST_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date),
  );
}

export function parseToKstYmd(dateString: string | null | undefined): KstYmd | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return getKstYmd(date);
}

function ymdToUtcMs(ymd: KstYmd): number {
  return Date.UTC(ymd.year, ymd.month - 1, ymd.day);
}

export function daysBetweenKst(fromYmd: KstYmd, toYmd: KstYmd): number {
  return Math.round((ymdToUtcMs(toYmd) - ymdToUtcMs(fromYmd)) / (1000 * 60 * 60 * 24));
}

export function daysUntilKst(dateString: string | null | undefined, baseDate: Date = new Date()): number | null {
  const target = parseToKstYmd(dateString);
  if (!target) return null;
  return daysBetweenKst(getKstYmd(baseDate), target);
}

export function isKstDateInCurrentMonth(dateString: string | null | undefined, baseDate: Date = new Date()): boolean {
  const target = parseToKstYmd(dateString);
  if (!target) return false;
  const today = getKstYmd(baseDate);
  return target.year === today.year && target.month === today.month;
}

export function isExpiringWithinDaysKst(
  serviceEndDate: string | null | undefined,
  days: number,
  baseDate: Date = new Date(),
): boolean {
  const remaining = daysUntilKst(serviceEndDate, baseDate);
  return remaining !== null && remaining >= 0 && remaining <= days;
}

export function formatDday(serviceEndDate: string | null | undefined, baseDate: Date = new Date()): string {
  const remaining = daysUntilKst(serviceEndDate, baseDate);
  if (remaining === null) return '-';
  if (remaining < 0) return `만료됨 (D+${Math.abs(remaining)})`;
  if (remaining === 0) return 'D-Day';
  return `D-${remaining}`;
}

/** 결제일(paid_at) 우선, 없으면 service_start_date */
export function getSubscriberPaymentDate(subscriber: {
  paid_at?: string | null;
  service_start_date?: string | null;
}): string | null {
  return subscriber.paid_at ?? subscriber.service_start_date ?? null;
}
