import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

export const metadata: Metadata = {
  title: '런웨이 서비스 결제 신청',
  description: '런웨이 광고관리 서비스 비회원 결제 신청 페이지',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
