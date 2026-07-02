'use client';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
};

export function AdminSearchBar({ value, onChange, onSearch, placeholder }: Props) {
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? '이름 · 연락처 · 회사명 검색'}
        className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        검색
      </button>
    </form>
  );
}
