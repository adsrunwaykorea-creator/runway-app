import { Suspense } from 'react';
import PaymentCheckoutClient from './PaymentCheckoutClient';

export default function PaymentCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100">
          <p className="text-zinc-600">로그인 상태 확인 중...</p>
        </div>
      }
    >
      <PaymentCheckoutClient />
    </Suspense>
  );
}
