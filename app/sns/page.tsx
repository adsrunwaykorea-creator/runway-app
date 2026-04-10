"use client";

import { useEffect } from "react";
import { StaticHtmlLoader } from "@/components/site/StaticHtmlLoader";
import { normalizeMarketingHtml } from "@/lib/marketingHtmlNormalize";

export default function SnsPage() {
  useEffect(() => {
    document.body.classList.add("page-sns");
    return () => {
      document.body.classList.remove("page-sns");
    };
  }, []);

  return <StaticHtmlLoader src="/html/sns.html" normalizeHtml={normalizeMarketingHtml} />;
}
