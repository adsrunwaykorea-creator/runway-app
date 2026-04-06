import { requireProfileComplete } from '@/lib/requireProfile';
import PaymentCheckoutClient from './PaymentCheckoutClient';

export default async function PaymentCheckoutPage() {
  await requireProfileComplete('/payment');
  return <PaymentCheckoutClient />;
}
