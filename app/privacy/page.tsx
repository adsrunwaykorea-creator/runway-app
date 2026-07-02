import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy-content';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 런웨이',
  description: '런웨이 개인정보처리방침 전문입니다.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      badge="PRIVACY POLICY"
      title="개인정보처리방침"
      intro="런웨이는 정보주체의 개인정보를 관련 법령에 따라 안전하게 처리합니다."
      sections={PRIVACY_SECTIONS}
    />
  );
}
