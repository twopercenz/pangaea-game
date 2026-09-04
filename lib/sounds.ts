// 효과음 — 정답/오답 연출에 맞춰 재생한다.

import { CORRECT_SOUND_BASE64 } from "./correctSoundData";
import { INCORRECT_SOUND_BASE64 } from "./incorrectSoundData";

// public/에서 fetch로 불러오면 네트워크 왕복(느린 회선/캐시 미스 시 수백ms~초 단위)이
// 재생 시점을 밀어낼 수 있어, 아예 base64로 번들에 인라인해서 네트워크 지연을 없앤다.
export const INCORRECT_SOUND = "incorrect" as const;
export const CORRECT_SOUND = "correct" as const;

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const loadingCache = new Map<string, Promise<AudioBuffer>>();

const SOUND_DATA: Record<string, string> = {
  [INCORRECT_SOUND]: INCORRECT_SOUND_BASE64,
  [CORRECT_SOUND]: CORRECT_SOUND_BASE64,
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(src);
  if (cached) return Promise.resolve(cached);
  const inFlight = loadingCache.get(src);
  if (inFlight) return inFlight;

  const base64 = SOUND_DATA[src];
  const promise = (
    base64
      ? ctx.decodeAudioData(base64ToArrayBuffer(base64))
      : Promise.reject(new Error(`unknown sound: ${src}`))
  ).then((buffer) => {
    bufferCache.set(src, buffer);
    loadingCache.delete(src);
    return buffer;
  });
  loadingCache.set(src, promise);
  return promise;
}

/** 인라인 base64를 디코딩해 AudioBuffer로 캐싱해둔다 — 실제 재생 시점엔 디코딩 없이
 * 바로 source.start()만 하면 되도록. 네트워크 fetch가 없으니 페이지 로드 직후 끝난다. */
export function preloadSounds() {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const src of [INCORRECT_SOUND, CORRECT_SOUND]) {
    void loadBuffer(ctx, src);
  }
}

/** AudioContext는 사용자 제스처 없이 만들면 "suspended" 상태로 시작한다(자동재생 정책).
 * suspended 상태에서 source.start()를 불러도 실제로는 resume()이 끝나야 소리가 나가는데,
 * 그 resume()이 클릭 이벤트의 동기 흐름 밖(예: await 이후)에서 걸리면 완료 시점이 브라우저마다
 * 들쭉날쭉해서 재생이 크게 밀린다. 그래서 클릭 등 실제 제스처 핸들러 "맨 앞"에서 동기적으로
 * 이 함수를 불러 미리 resume을 걸어둬야 한다 — playSound() 호출 시점엔 이미 running이어야 함. */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "running") void ctx.resume();
}

/** 브라우저 자동재생 정책으로 막힐 수 있어 실패해도 조용히 무시한다. */
export function playSound(src: string) {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();
  const play = (buffer: AudioBuffer) => {
    try {
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
