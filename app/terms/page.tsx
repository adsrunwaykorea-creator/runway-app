import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { TERMS_SECTIONS } from '@/lib/legal/terms-content';

export const metadata: Metadata = {
  title: '서비스 이용약관 | 런웨이',
  description: '런웨이 서비스 이용약관 전문입니다.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      badge="TERMS OF SERVICE"
      title="서비스 이용약관"
      intro="런웨이 웹사이트 및 관련 서비스 이용에 관한 약관 전문입니다."
      sections={TERMS_SECTIONS}
    />
  );
}
