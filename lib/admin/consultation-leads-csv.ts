import type { ConsultationLeadRow } from '@/types/consultation-lead';
import { formatDate } from '@/lib/date';

function csvCell(value: string | null | undefined): string {
  const text = (value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

export function buildConsultationLeadsCsv(leads: ConsultationLeadRow[]): string {
  const header = [
    '신청일',
    '이름 / 연락처',
    '회사명',
    '업종',
    '문의 내용',
    '처리상태',
    '관리자 메모',
  ];

  const rows = leads.map((lead) => {
    const name = lead.lead_name?.trim();
    const phone = lead.phone?.trim();
    const namePhone = name && phone ? `${name} / ${phone}` : name || phone || '';
    const company = lead.company_name?.trim() || lead.company?.trim() || '';

    return [
      formatDate(lead.created_at),
      namePhone,
      company,
      lead.business_type,
      lead.message,
      lead.status,
      lead.admin_memo,
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
  return `consultation-leads-${year}-${month}-${day}.csv`;
}

export function downloadConsultationLeadsCsv(leads: ConsultationLeadRow[]) {
  const csv = buildConsultationLeadsCsv(leads);
  const blob = new Blob([UTF8_BOM, csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvDownloadFilename();
  link.click();
  URL.revokeObjectURL(url);
}
