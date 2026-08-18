import type { Metadata } from "next";
import PackageGrowthClient from "./PackageGrowthClient";

export const metadata: Metadata = {
  title: "사업 성장 패키지 | 광고 운영·성과 마케팅 - RUNWAY",
  description:
    "검색광고, SNS, 플레이스, 콘텐츠, 예약까지 — 고객 유입부터 전환까지 본격적으로 운영하는 사업 성장 패키지.",
};

export default function PackageGrowthPage() {
  return <PackageGrowthClient />;
}
