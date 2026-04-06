import { Suspense } from 'react';
import { requireProfileComplete } from '@/lib/requireProfile';
import PaymentPageClient from './PaymentPageClient';

export default async function PaymentPage() {
  await requireProfileComplete('/payment');
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100" />}>
      <PaymentPageClient />
    </Suspense>
  );
}
