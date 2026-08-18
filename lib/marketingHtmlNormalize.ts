/** Shared link fixes for public/html/*.html when embedded under Next routes. */
export function normalizeMarketingHtml(html: string): string {
  return html
    .replaceAll('href="style.css"', 'href="/html/style.css"')
    .replaceAll('href="style.css?v=db-mobile-20260329"', 'href="/html/style.css?v=db-mobile-20260329"')
    .replaceAll('href="index.html#contact"', 'href="/package/starter#contact"')
    .replaceAll('href="index.html#services"', 'href="/package/starter"')
    .replaceAll('href="index.html"', 'href="/package/starter"')
    .replaceAll('href="sns.html"', 'href="/sns"')
    .replaceAll('href="db.html"', 'href="/db"')
    .replaceAll('href="package-starter.html"', 'href="/package/starter"')
    .replaceAll('href="package-growth.html"', 'href="/package/growth"')
    .replaceAll('href="login.html"', 'href="/login"');
}
