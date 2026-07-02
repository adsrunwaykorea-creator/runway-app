import type { Metadata } from 'next';
import CheckoutSuccessClient from './CheckoutSuccessClient';

export const metadata: Metadata = {
  title: '카카오페이 결제 완료 | 런웨이',
};

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessClient />;
}
