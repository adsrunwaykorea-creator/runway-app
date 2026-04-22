'use client';

import { useSearchParams } from 'next/navigation';

export default function PaymentPageClient() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const src = qs ? `/html/payment.html?${qs}` : '/html/payment.html';

  return (
    <main
      className="bg-gradient-to-b from-zinc-50 to-slate-100"
      style={{
        width: '100%',
        minHeight: '100dvh',
      }}
    >
      <iframe
        src={src}
        title="runway-payment"
        className="block border-0"
        style={{
          display: 'block',
          width: '100%',
          height: '100dvh',
          border: 0,
        }}
      />
    </main>
  );
}
