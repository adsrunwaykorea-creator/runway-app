"use client";

import { useEffect } from "react";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";

export default function PackageStarterClient() {
  useEffect(() => {
    document.body.classList.add("page-package-starter");
    return () => {
      document.body.classList.remove("page-package-starter");
    };
  }, []);

  return (
    <StaticHtmlLoader
      src="/html/package-starter.html?v=lead06"
      normalizeHtml={normalizeMarketingHtml}
    />
  );
}
