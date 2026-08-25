"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  bindConsultationTracking,
  exposeRunwayMeta,
  initializeMetaPixel,
  trackPageView,
} from "@/lib/meta/pixel";
import { captureAttribution } from "@/lib/meta/attribution";

type Props = {
  pixelId: string;
};

export function MetaPixel({ pixelId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const id = pixelId.trim();

  useEffect(() => {
    exposeRunwayMeta();
  }, []);

  useEffect(() => {
    captureAttribution();
    if (!id) return;
    initializeMetaPixel(id);
    const pageKey = search ? `${pathname}?${search}` : pathname;
    trackPageView(pageKey);
  }, [id, pathname, search]);

  useEffect(() => {
    if (!id) return;
    return bindConsultationTracking();
  }, [id]);

  if (!id) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `}
    </Script>
  );
}
