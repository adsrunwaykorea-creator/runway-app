"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** e.g. `/html/index.html` */
  src: string;
  normalizeHtml: (html: string) => string;
};

/**
 * Injects marketing static HTML into a container without `document.write`,
 * so React (e.g. root layout chatbot) stays mounted.
 * Executes <script> tags from the original body in order after DOM is ready.
 */
export function StaticHtmlLoader({ src, normalizeHtml }: Props) {
  const [error, setError] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const shell = shellRef.current;
    if (!shell) return;

    const injectLink = (link: HTMLLinkElement): Promise<void> => {
      const href = link.getAttribute("href");
      if (!href) return Promise.resolve();
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
        (l) => l.getAttribute("href") === href,
      );
      if (exists) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const done = () => resolve();
        const failSafe = window.setTimeout(done, 2000);

        const clearAndResolve = () => {
          window.clearTimeout(failSafe);
          done();
        };

      const clone = document.createElement("link");
      clone.rel = "stylesheet";
      clone.href = href;
      clone.setAttribute("data-runway-injected", "1");
        clone.addEventListener("load", clearAndResolve, { once: true });
        clone.addEventListener("error", clearAndResolve, { once: true });
      document.head.appendChild(clone);
      });
    };

    const run = async () => {
      try {
        const response = await fetch(src, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load html: ${response.status}`);
        }
        const raw = normalizeHtml(await response.text());
        if (cancelled) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, "text/html");

        const styleLoadPromises = Array.from(
          doc.querySelectorAll("head link[rel='stylesheet']"),
        ).map((n) => injectLink(n as HTMLLinkElement));
        await Promise.all(styleLoadPromises);
        if (cancelled) return;

        shell.innerHTML = "";
        const scripts: HTMLScriptElement[] = [];

        Array.from(doc.body.children).forEach((node) => {
          if (node.nodeName === "SCRIPT") {
            scripts.push(node as HTMLScriptElement);
          } else {
            shell.appendChild(document.importNode(node, true));
          }
        });

        scripts.forEach((old) => {
          const s = document.createElement("script");
          s.setAttribute("data-runway-injected", "1");
          if (old.src) {
            s.src = old.src;
            s.async = false;
          } else {
            s.textContent = old.textContent;
          }
          document.body.appendChild(s);
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render page");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [src, normalizeHtml]);

  if (error) {
    return <main style={{ padding: 24 }}>페이지 로딩 실패: {error}</main>;
  }

  return (
    <div
      ref={shellRef}
      className="runway-static-html min-h-0 flex-1"
      suppressHydrationWarning
    />
  );
}
