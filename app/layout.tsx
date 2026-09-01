import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "판게아 게임",
  description: "퀴즈를 맞혀 대륙 조각을 밀어 판게아를 완성하는 온라인 카드 게임",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
