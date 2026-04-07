import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export const dynamic = "force-dynamic";

function PaymentSuccessFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <p className="text-sm text-zinc-500">로딩 중...</p>
      </section>
    </main>
  );
}

export default function PaymentSuccessLandingPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessClient />
    </Suspense>
  );
}
