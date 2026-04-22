import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100 p-4 sm:p-6">
      <section className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-8">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900">회원가입 없이 이용 가능합니다</h1>
        <p className="mb-6 text-sm leading-7 text-zinc-600">
          런웨이 고객 신청과 결제는 비회원 기준으로 운영됩니다. 서비스 신청, 광고 상담, 결제 안내는
          아래 경로에서 바로 진행해주세요.
        </p>

        <div className="space-y-2">
          <Link
            href="/payment"
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            결제 안내 보기
          </Link>
          <Link
            href="/#contact"
            className="flex h-11 w-full items-center justify-center rounded-[10px] border border-zinc-300 bg-white text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
          >
            광고 상담 신청
          </Link>
        </div>
      </section>
    </main>
  );
}
