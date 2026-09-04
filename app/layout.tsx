import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "판게아 게임",
  description: "퀴즈를 맞혀 대륙 조각을 밀어 판게아를 완성하는 온라인 카드 게임",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <head>
        {/* 폰트는 첫 화면을 막는 요청이라 CDN 연결(DNS+TLS)을 미리 열어둔다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {/*
          static/pretendard.css는 굵기별로 통 woff2(굵기 하나에 ~1MB)를 통째로 받는다.
          dynamic-subset은 완전히 같은 글꼴을 unicode-range로 잘게 쪼갠 것이라, 브라우저가
          실제로 화면에 쓰인 글자가 들어 있는 조각(수십 KB)만 받는다. 보이는 결과는 동일.
        */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
