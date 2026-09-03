// public/sound/ 아래 효과음 — 정답/오답 연출에 맞춰 재생한다.

export const INCORRECT_SOUND = "/sound/incorrect.mp3";

/** 브라우저 자동재생 정책으로 막힐 수 있어 실패해도 조용히 무시한다. */
export function playSound(src: string) {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(src);
    void audio.play().catch(() => {});
  } catch {
    // no-op
  }
}
