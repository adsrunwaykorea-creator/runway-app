import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '결제 신청 완료 | 런웨이',
};

export default function CheckoutCompletePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">결제 신청 접수 완료</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-700">
          결제 요청이 접수되었습니다. 담당자가 확인 후 결제 안내를 드리겠습니다.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-zinc-900 px-5 text-sm font-semibold text-white"
          >
            홈으로
          </Link>
          <Link
            href="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-zinc-300 bg-white px-5 text-sm font-semibold text-slate-800"
          >
            결제 신청 페이지
          </Link>
        </div>
      </section>
    </main>
  );
}
