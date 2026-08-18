import type { Metadata } from "next";
import PackageStarterClient from "./PackageStarterClient";

export const metadata: Metadata = {
  title: "초보 창업 패키지 | 1주일 완성 마케팅 세팅 - RUNWAY",
  description:
    "검색광고, SNS, 플레이스, 블로그, 예약까지 — 초보 창업을 위한 1주일 완성 마케팅 세팅 패키지. 660,000원.",
};

export default function PackageStarterPage() {
  return <PackageStarterClient />;
}
