'use client';

type Props = {
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function pageNumbers(current: number, total: number): number[] {
  const maxButtons = 5;
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  const end = Math.min(total, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
}

export function AdminPagination({ total, page, totalPages, onPageChange }: Props) {
  if (total === 0) return null;

  const pages = pageNumbers(page, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-600">
        총 {total}건 · {page} / {totalPages} 페이지
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          ◀ 이전
        </button>
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`min-w-[2rem] rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
              pageNumber === page
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-zinc-300 bg-white text-slate-800'
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          다음 ▶
        </button>
      </div>
    </div>
  );
}
