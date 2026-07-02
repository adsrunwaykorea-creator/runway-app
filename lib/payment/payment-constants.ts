export const PAYMENT_CHANNELS = [
  { value: 'bank_transfer', label: '계좌이체' },
  { value: 'kakao_pay', label: '카카오페이' },
  { value: 'card', label: '카드결제' },
  { value: 'cash', label: '현금' },
  { value: 'other', label: '기타' },
] as const;

export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number]['value'];

export const PAYMENT_REQUEST_STATUSES = [
  '입금대기',
  '결제요청',
  '결제완료',
  '취소',
  '환불',
] as const;

export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

export const PAYMENT_MANAGEMENT_STATUSES = [
  '서비스중',
  '서비스종료',
  '환불',
  '재결제대기',
] as const;

export type PaymentManagementStatus = (typeof PAYMENT_MANAGEMENT_STATUSES)[number];

const CHANNEL_LABEL_MAP = Object.fromEntries(
  PAYMENT_CHANNELS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export function formatPaymentChannel(value: string | null | undefined): string {
  if (!value) return '미입력';
  if (value === 'manual') return '수동처리';
  if (value === 'kakaopay') return '카카오페이';
  return CHANNEL_LABEL_MAP[value] ?? value;
}

export function normalizePaymentChannel(value: string | null | undefined): PaymentChannel {
  if (value === 'kakaopay' || value === 'kakao_pay') return 'kakao_pay';
  if (value === 'bank_transfer' || value === 'card' || value === 'cash' || value === 'other') {
    return value;
  }
  return 'bank_transfer';
}

export function addServiceDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}
