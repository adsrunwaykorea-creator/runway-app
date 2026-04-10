"use client";

import { useEffect } from "react";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";

export default function DbPage() {
  useEffect(() => {
    document.body.classList.add("page-db");
    return () => {
      document.body.classList.remove("page-db");
    };
  }, []);

  return <StaticHtmlLoader src="/html/db.html" normalizeHtml={normalizeMarketingHtml} />;
}
