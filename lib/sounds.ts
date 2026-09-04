// public/sound/ 아래 효과음 — 정답/오답 연출에 맞춰 재생한다.

export const INCORRECT_SOUND = "/sound/incorrect.mp3";

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const loadingCache = new Map<string, Promise<AudioBuffer>>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

async function loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(src);
  if (cached) return cached;
  const inFlight = loadingCache.get(src);
  if (inFlight) return inFlight;

  const promise = fetch(src)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      bufferCache.set(src, buffer);
      loadingCache.delete(src);
      return buffer;
    });
  loadingCache.set(src, promise);
  return promise;
}

/** HTMLAudioElement.play()는 브라우저마다 재생 시작까지 수십~수백ms의 지연이 있어
 * 화면 연출(FAIL 플래시)과 타이밍을 맞추기 어렵다. Web Audio API로 디코딩된 버퍼를
 * 미리 준비해두면 실제 재생 시점의 지연이 사실상 0에 가까워 화면과 싱크가 맞는다. */
export function preloadSounds() {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const src of [INCORRECT_SOUND]) {
    void loadBuffer(ctx, src);
  }
}

/** 브라우저 자동재생 정책으로 막힐 수 있어 실패해도 조용히 무시한다. */
export function playSound(src: string) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const play = (buffer: AudioBuffer) => {
    try {
      if (ctx.state === "suspended") void ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // no-op
    }
  };
  const cached = bufferCache.get(src);
  if (cached) {
    play(cached);
    return;
  }
  void loadBuffer(ctx, src)
    .then(play)
    .catch(() => {
      // no-op
    });
}
