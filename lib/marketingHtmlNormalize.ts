/** Shared link fixes for public/html/*.html when embedded under Next routes. */
export function normalizeMarketingHtml(html: string): string {
  return html
    .replaceAll('href="style.css"', 'href="/html/style.css"')
    .replaceAll('href="style.css?v=db-mobile-20260329"', 'href="/html/style.css?v=db-mobile-20260329"')
    .replaceAll('href="index.html#services"', 'href="/#services"')
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="sns.html"', 'href="/sns"')
    .replaceAll('href="db.html"', 'href="/db"')
    .replaceAll('href="login.html"', 'href="/login"');
}
