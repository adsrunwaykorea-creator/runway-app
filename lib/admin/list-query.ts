export const ADMIN_PAGE_SIZE = 5;

export type ParsedListQuery = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
  q: string;
  includeAll: boolean;
};

export function parseListQuery(searchParams: URLSearchParams): ParsedListQuery {
  const includeAll = searchParams.get('includeAll') === '1';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = (searchParams.get('q') ?? '').trim();

  return { page, pageSize, from, to, q, includeAll };
}

export function buildListMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function escapeIlikeTerm(value: string): string {
  return value.replace(/[%_,]/g, '');
}

export function leadSearchOrFilter(q: string): string | null {
  const term = escapeIlikeTerm(q);
  if (!term) return null;
  const pattern = `%${term}%`;
  return `lead_name.ilike.${pattern},phone.ilike.${pattern},company.ilike.${pattern},company_name.ilike.${pattern}`;
}

export function subscriberSearchOrFilter(q: string): string | null {
  const term = escapeIlikeTerm(q);
  if (!term) return null;
  const pattern = `%${term}%`;
  return `name.ilike.${pattern},phone.ilike.${pattern},company.ilike.${pattern}`;
}
