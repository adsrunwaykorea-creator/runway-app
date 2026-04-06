'use client';

import { useSearchParams } from 'next/navigation';

export default function PaymentPageClient() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const src = qs ? `/html/payment.html?${qs}` : '/html/payment.html';
  return <iframe src={src} className="w-full min-h-screen border-0" />;
}
