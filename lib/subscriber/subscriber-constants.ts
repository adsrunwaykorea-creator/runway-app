export const SUBSCRIBER_PAYMENT_CHANNELS = [
  { value: 'bank_transfer', label: '계좌이체' },
  { value: 'kakao_pay', label: '카카오페이' },
  { value: 'card', label: '카드결제' },
  { value: 'cash', label: '현금' },
  { value: 'other', label: '기타' },
] as const;

export const SUBSCRIBER_SERVICE_STATUSES = [
  '진행중',
  '만료예정',
  '재결제요청',
  '서비스종료',
  '보류',
  '환불',
] as const;

export type SubscriberServiceStatus = (typeof SUBSCRIBER_SERVICE_STATUSES)[number];

export const ACTIVE_SUBSCRIBER_STATUSES = ['진행중', '만료예정', '재결제요청', '보류'] as const;

const CHANNEL_LABEL_MAP = Object.fromEntries(
  SUBSCRIBER_PAYMENT_CHANNELS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export function formatSubscriberPaymentMethod(value: string | null | undefined): string {
  if (!value) return '미입력';
  if (value === 'manual') return '수동처리';
  if (value === 'kakaopay') return '카카오페이';
  return CHANNEL_LABEL_MAP[value] ?? value;
}

import {
  daysUntilKst,
  isExpiringWithinDaysKst as isExpiringWithinDaysKstDate,
} from '@/lib/date-kst';

export function formatRemainingServicePeriod(serviceEndDate: string | null | undefined): string {
  const remaining = daysUntilKst(serviceEndDate);
  if (remaining === null) return '-';
  if (remaining < 0) return '만료됨';
  if (remaining === 0) return '오늘 만료';
  return `${remaining}일 남음`;
}

export function isExpiringWithinDays(serviceEndDate: string | null | undefined, days: number): boolean {
  return isExpiringWithinDaysKstDate(serviceEndDate, days);
}

export function computeSuggestedServiceStatus(
  serviceEndDate: string | null | undefined,
  currentStatus: string,
): string {
  if (currentStatus === '재결제요청' || currentStatus === '보류' || currentStatus === '환불') {
    return currentStatus;
  }
  if (isExpiringWithinDays(serviceEndDate, 7)) {
    return '만료예정';
  }
  return currentStatus === '만료예정' ? '진행중' : currentStatus;
}
