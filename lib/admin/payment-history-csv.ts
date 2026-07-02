import type { PaymentHistoryRow } from '@/types/payment-history';
import { formatDate } from '@/lib/date';
import { formatPaymentChannel } from '@/lib/payment/payment-constants';

function csvCell(value: string | null | undefined): string {
  const text = (value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

export function buildPaymentHistoryCsv(payments: PaymentHistoryRow[]): string {
  const header = [
    '이름',
    '연락처',
    '회사명',
    '업종',
    '문의내용',
    '결제수단',
    '결제금액',
    '결제일',
    '관리자 메모',
  ];

  const rows = payments.map((row) => {
    return [
      row.customer_name,
      row.customer_phone,
      row.company_name ?? '',
      row.business_type ?? '',
      row.consultation_message?.trim() ?? '',
      formatPaymentChannel(row.payment_method),
      row.amount > 0 ? String(row.amount) : '',
      formatDate(row.paid_at),
      row.admin_memo ?? '',
    ]
      .map(csvCell)
      .join(',');
  });

  return `${header.map(csvCell).join(',')}\n${rows.join('\n')}`;
}

const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

function csvDownloadFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `paid-customers-${year}-${month}-${day}.csv`;
}

export function downloadPaymentHistoryCsv(payments: PaymentHistoryRow[]) {
  const csv = buildPaymentHistoryCsv(payments);
  const blob = new Blob([UTF8_BOM, csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvDownloadFilename();
  link.click();
  URL.revokeObjectURL(url);
}
