import type { Metadata } from 'next';
import CheckoutCompleteClient from './CheckoutCompleteClient';

export const metadata: Metadata = {
  title: '결제 신청 완료 | 런웨이',
};

export default function CheckoutCompletePage() {
  return <CheckoutCompleteClient />;
}
