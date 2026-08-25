"use client";

import { useEffect } from "react";
import { PackageHeader } from "@/components/site/PackageHeader";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";
import { trackViewContent } from "@/lib/meta/pixel";

export default function PackageStarterClient() {
  useEffect(() => {
    document.body.classList.add("page-package-starter");
    trackViewContent();
    return () => {
      document.body.classList.remove("page-package-starter");
    };
  }, []);

  return (
    <>
      <PackageHeader active="starter" />
      <StaticHtmlLoader
        src="/html/package-starter.html?v=lead16"
        normalizeHtml={normalizeMarketingHtml}
      />
    </>
  );
}
