import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://runway-app-lyart.vercel.app";

const title = "런웨이 | 광고비 수수료 0원 소상공인 광고대행";
const description =
  "런웨이는 당근, 네이버, 인스타그램, 구글 광고를 상권과 업종에 맞게 운영하는 광고대행사입니다. 광고비는 고객이 직접 결제하고, 기획·세팅·운영·리포트만 투명하게 대행합니다.";
const openGraphDescription =
  "런웨이는 당근, 네이버, 인스타그램, 구글 광고를 상권과 업종에 맞게 운영하는 광고대행사입니다.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "런웨이",
    "런웨이 광고대행",
    "소상공인 광고대행",
    "당근 광고대행",
    "네이버 광고대행",
    "SNS 마케팅 대행",
    "동네 매장 광고",
    "병원 광고",
    "학원 광고",
    "미용실 광고",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description: openGraphDescription,
    url: siteUrl,
    siteName: "런웨이",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: openGraphDescription,
  },
  verification: {
    google: "dhUloy-bMYDzihv0RMVhKBv0hq05M6WkcoOfJtX4i_A",
    other: {
      "naver-site-verification": "9a784d101e03d0971efaf8ebe1f036cb594f91a7",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
