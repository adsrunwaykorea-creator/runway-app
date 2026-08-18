import type { Metadata } from "next";
import PackageStarterClient from "./PackageStarterClient";

const EMPATHY_VIDEO_SRC = "/html/assets/blueprint-starter/empathy-web.mp4?v=web1";

export const metadata: Metadata = {
  title: "초보 창업 패키지 | 1주일 완성 마케팅 세팅 - RUNWAY",
  description:
    "검색광고, SNS, 플레이스, 블로그, 예약까지 — 초보 창업을 위한 1주일 완성 마케팅 세팅 패키지. 660,000원.",
};

export default function PackageStarterPage() {
  return (
    <>
      <link
        rel="preload"
        href={EMPATHY_VIDEO_SRC}
        as="video"
        type="video/mp4"
        fetchPriority="high"
      />
      <PackageStarterClient />
    </>
  );
}
