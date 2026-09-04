import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 배럴 파일에서 아이콘 하나만 써도 패키지 전체를 훑던 걸 막아 번들/컴파일을 줄인다.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    // 개발 중 남은 로그가 프로덕션 번들에 실려 나가지 않게 한다 (error/warn은 남긴다).
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // 정적 사진/사운드는 내용이 바뀌면 파일명을 바꾸는 자산이라, 오래 캐시해도 안전하다.
  async headers() {
    return [
      {
        source: "/:dir(pictures|sound|plates)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
