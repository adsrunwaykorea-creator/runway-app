import { Suspense } from 'react';
import PaymentPageClient from './PaymentPageClient';

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100">
          <p className="text-zinc-600">결제 페이지를 불러오는 중...</p>
        </div>
      }
    >
      <PaymentPageClient />
    </Suspense>
  );
}
