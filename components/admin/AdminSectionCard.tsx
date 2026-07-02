'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  total: number;
  page: number;
  totalPages: number;
  displayCount: number;
  children: ReactNode;
};

export function AdminSectionCard({
  title,
  subtitle,
  total,
  page,
  totalPages,
  displayCount,
  children,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">■ {title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        <p className="mt-2 text-sm font-medium text-zinc-700">
          총 {total}건 · {displayCount}건 표시 · {page} / {totalPages} 페이지
        </p>
      </div>
      {children}
    </section>
  );
}
