import Link from 'next/link';
import type { ReactNode } from 'react';
import { RUNWAY_BUSINESS_INFO } from '@/lib/site/business-info';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: string[];
  highlight?: string;
};

type Props = {
  badge: string;
  title: string;
  intro?: string;
  sections: LegalSection[];
  children?: ReactNode;
};

const sectionClass = 'space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8';
const headingClass = 'text-lg font-semibold text-zinc-900 md:text-xl';
const bodyClass = 'text-sm leading-7 text-zinc-700 md:text-base md:leading-8';

export function LegalPageShell({ badge, title, intro, sections, children }: Props) {
  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">{badge}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{title}</h1>
          {intro ? <p className="mt-4 text-sm leading-7 text-zinc-600 md:text-base">{intro}</p> : null}
          {children}
        </header>

        <article className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className={sectionClass}>
              <h2 className={headingClass}>{section.title}</h2>
              {section.highlight ? (
                <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-medium leading-7 text-blue-900">
                  {section.highlight}
                </p>
              ) : null}
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className={bodyClass}>
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className={`${bodyClass} list-disc space-y-2 pl-5`}>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.ordered && section.ordered.length > 0 ? (
                <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
                  {section.ordered.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : null}
            </section>
          ))}
        </article>

        <LegalFooter />
      </div>
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
        <Link href="/terms" className="text-blue-700 underline">
          이용약관
        </Link>
        <Link href="/privacy" className="text-blue-700 underline">
          개인정보처리방침
        </Link>
        <Link href="/refund" className="text-blue-700 underline">
          환불규정
        </Link>
      </nav>
      <h2 className="text-base font-bold text-slate-900">사업자 정보</h2>
      <ul className="mt-3 space-y-1">
        <li>
          <span className="font-semibold">상호명:</span> {RUNWAY_BUSINESS_INFO.companyName}
        </li>
        <li>
          <span className="font-semibold">대표자명:</span> {RUNWAY_BUSINESS_INFO.representative}
        </li>
        <li>
          <span className="font-semibold">사업자등록번호:</span>{' '}
          {RUNWAY_BUSINESS_INFO.businessRegistrationNumber}
        </li>
        <li>
          <span className="font-semibold">사업장 주소:</span> {RUNWAY_BUSINESS_INFO.address}
        </li>
        <li>
          <span className="font-semibold">전화번호:</span>{' '}
          <a href={`tel:${RUNWAY_BUSINESS_INFO.phone.replace(/-/g, '')}`} className="text-blue-700 underline">
            {RUNWAY_BUSINESS_INFO.phone}
          </a>
        </li>
        <li>
          <span className="font-semibold">이메일:</span>{' '}
          <a href={`mailto:${RUNWAY_BUSINESS_INFO.email}`} className="text-blue-700 underline">
            {RUNWAY_BUSINESS_INFO.email}
          </a>
        </li>
        <li>
          <span className="font-semibold">통신판매업 신고번호:</span>{' '}
          {RUNWAY_BUSINESS_INFO.ecommerceRegistration}
        </li>
      </ul>
      <p className="mt-4">
        <Link href="/" className="font-semibold text-blue-700 underline">
          홈으로 돌아가기
        </Link>
      </p>
    </footer>
  );
}
