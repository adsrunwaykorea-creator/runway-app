import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { REFUND_SECTIONS } from '@/lib/legal/refund-content';

export const metadata: Metadata = {
  title: '환불규정 | 런웨이',
  description: '런웨이 서비스 결제 취소 및 환불 기준을 안내합니다.',
};

export default function RefundPage() {
  return (
    <LegalPageShell
      badge="REFUND POLICY"
      title="환불규정"
      intro="런웨이 광고관리 및 마케팅 서비스의 결제 취소·환불 기준을 안내합니다."
      sections={REFUND_SECTIONS}
    />
  );
}
