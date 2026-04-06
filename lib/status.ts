export type OrderStatus = '만료' | '긴급' | '곧 만료' | '진행중';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function getOrderStatus(expiresAt: string | null): OrderStatus {
  if (!expiresAt) return '만료';

  const expiresDate = new Date(expiresAt);
  if (Number.isNaN(expiresDate.getTime())) return '만료';

  const today = toDateOnly(new Date());
  const targetDate = toDateOnly(expiresDate);

  if (targetDate.getTime() < today.getTime()) {
    return '만료';
  }

  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / DAY_MS);
  if (diffDays <= 3) {
    return '긴급';
  }
  if (diffDays <= 7) {
    return '곧 만료';
  }

  return '진행중';
}
