"use client";

import { useEffect } from "react";
import { PackageHeader } from "@/components/site/PackageHeader";
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
    <>
      <PackageHeader active="growth" />
      <StaticHtmlLoader
        src="/html/package-growth.html?v=lead13"
        normalizeHtml={normalizeMarketingHtml}
      />
    </>
  );
}
