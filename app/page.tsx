"use client";

import { useEffect } from "react";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";

export default function HomePage() {
  useEffect(() => {
    document.body.classList.add("page-index");
    return () => {
      document.body.classList.remove("page-index");
    };
  }, []);

  return <StaticHtmlLoader src="/html/index.html" normalizeHtml={normalizeMarketingHtml} />;
}
