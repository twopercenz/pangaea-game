"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

/**
 * UI_SPEC: "캔버스 1920×1080 고정. 반응형 없음. 축소가 필요하면 전체 스케일링만."
 * 내부 레이아웃은 절대 리플로우하지 않고, 부모 컨테이너 크기에 맞춰 이 래퍼 전체를 scale()만 한다.
 * 그래서 항상 스크롤/잘림 없이 한 화면 안에 전부 보인다.
 * 부모가 크기(예: h-screen 또는 고정 높이)를 갖는 relative 컨테이너여야 한다.
 */
export function CanvasScale({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    function recompute() {
      const box = outerRef.current;
      if (!box) return;
      const s = Math.min(box.clientWidth / CANVAS_W, box.clientHeight / CANVAS_H);
      // 같은 값이면 상태를 건드리지 않는다 — 캔버스 전체 리렌더를 막는다.
      setScale((prev) => (prev === s ? prev : s));
    }
    recompute();
    // ResizeObserver가 창 크기 변화까지 이미 잡아주므로 window resize 리스너는 중복이었다.
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="absolute inset-0 overflow-hidden bg-[var(--bg)]">
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
