/**
 * 브라우저에서 public 정적 파일을 요청할 때 동일 출처 절대 URL로 맞춥니다.
 * (프록시/일부 환경에서 상대 경로 해석이 어긋나는 경우 완화)
 */
export function publicAssetUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, window.location.origin).href;
}

export const publicHtmlFetchInit: RequestInit = { cache: 'no-store' };
