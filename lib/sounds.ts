// public/sound/ 아래 효과음 — 정답/오답 연출에 맞춰 재생한다.

export const INCORRECT_SOUND = "/sound/incorrect.mp3";

const audioCache = new Map<string, HTMLAudioElement>();

/** 사진처럼 미리 로드해둬서, 실제 재생 시점에 네트워크 fetch/decode 지연 없이
 * 화면 연출(FAIL 플래시)과 같은 타이밍에 소리가 나가도록 한다. */
export function preloadSounds() {
  if (typeof window === "undefined") return;
  for (const src of [INCORRECT_SOUND]) {
    if (audioCache.has(src)) continue;
    const audio = new Audio(src);
    audio.preload = "auto";
    audioCache.set(src, audio);
  }
}

/** 브라우저 자동재생 정책으로 막힐 수 있어 실패해도 조용히 무시한다. */
export function playSound(src: string) {
  if (typeof window === "undefined") return;
  try {
    const cached = audioCache.get(src);
    const audio = cached ?? new Audio(src);
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // no-op
  }
}
