'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const normalizeHtmlLinks = (html: string) =>
      html
        .replaceAll('href="style.css"', 'href="/html/style.css"')
        .replaceAll('href="style.css?v=db-mobile-20260329"', 'href="/html/style.css?v=db-mobile-20260329"')
        .replaceAll('href="index.html#services"', 'href="/#services"')
        .replaceAll('href="index.html"', 'href="/"')
        .replaceAll('href="sns.html"', 'href="/sns"')
        .replaceAll('href="db.html"', 'href="/db"')
        .replaceAll('href="login.html"', 'href="/login"');

    const renderHtml = async () => {
      try {
        const response = await fetch('/html/index.html');
        if (!response.ok) {
          throw new Error(`Failed to load html: ${response.status}`);
        }
        const html = normalizeHtmlLinks(await response.text());

        if (cancelled) return;

        document.open();
        document.write(html);
        document.close();
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to render page';
          setError(message);
        }
      }
    };

    void renderHtml();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <main style={{ padding: 24 }}>페이지 로딩 실패: {error}</main>;
  }

  return <main style={{ padding: 24 }}>페이지 로딩 중...</main>;
}
