"use client";

import { useEffect } from "react";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";

export default function PackageGrowthClient() {
  useEffect(() => {
    document.body.classList.add("page-package-growth");
    return () => {
      document.body.classList.remove("page-package-growth");
    };
  }, []);

  return (
    <StaticHtmlLoader
      src="/html/package-growth.html?v=lead01"
      normalizeHtml={normalizeMarketingHtml}
    />
  );
}
