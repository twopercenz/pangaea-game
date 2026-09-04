import { EventId } from "./types";

// public/pictures/ 아래 정적 이미지 목록 — 카테고리별로 랜덤 하나를 뽑아 결과/이벤트 연출에 쓴다.
// 새 사진을 추가할 때는 해당 폴더에 파일을 넣고 이 배열에도 경로를 추가하면 된다.
// 원본 PNG는 합쳐서 10MB가 넘어 프리로드만으로 회선을 다 먹었다. 같은 그림을 WebP로
// 다시 인코딩해 0.8MB로 줄였고(약 92% 감소), 여기서는 .webp 쪽을 가리킨다.

export const RESULT_PICTURES: Record<"correct" | "incorrect", string[]> = {
  correct: [
    "/pictures/fail_or_success/correct/1.webp",
    "/pictures/fail_or_success/correct/2.webp",
    "/pictures/fail_or_success/correct/3.webp",
    "/pictures/fail_or_success/correct/4.webp",
  ],
  incorrect: [
    "/pictures/fail_or_success/incorrect/1.webp",
    "/pictures/fail_or_success/incorrect/2.webp",
    "/pictures/fail_or_success/incorrect/3.webp",
    "/pictures/fail_or_success/incorrect/4.webp",
    "/pictures/fail_or_success/incorrect/5.webp",
    "/pictures/fail_or_success/incorrect/6.webp",
    "/pictures/fail_or_success/incorrect/7.webp",
  ],
};

export const EVENT_PICTURES: Record<EventId, string[]> = {
  meteor_strike: [
    "/pictures/event/meteor_strike/1.webp",
    "/pictures/event/meteor_strike/2.webp",
    "/pictures/event/meteor_strike/3.webp",
    "/pictures/event/meteor_strike/4.webp",
  ],
  mass_extinction: [
    "/pictures/event/mass_extinction/1.webp",
    "/pictures/event/mass_extinction/2.webp",
    "/pictures/event/mass_extinction/3.webp",
    "/pictures/event/mass_extinction/4.webp",
    "/pictures/event/mass_extinction/5.webp",
  ],
  ice_age: ["/pictures/event/ice_age/1.webp"],
  species_boom: ["/pictures/event/species_boom/1.webp", "/pictures/event/species_boom/2.webp"],
  volcanic_boost: ["/pictures/event/volcanic_boost/1.webp"],
  // 아직 사진이 없음 — 채워지기 전까지는 이 이벤트만 사진 없이 표시된다.
  continental_surge: [],
};

// 카테고리별로 방금 뽑았던 사진 — 풀이 작을 때 같은 사진이 연달아 뜨는 걸 막는 데 쓴다.
const lastPickedByCategory = new Map<string, string>();

/**
 * pool 안에서 무작위로 하나 뽑는다. category를 넘기면, 풀에 사진이 2장 이상일 때
 * 직전에 그 카테고리에서 뽑았던 사진은 이번엔 후보에서 뺀다 (연속 반복 방지).
 */
export function pickPicture(pool: string[], category?: string): string | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const last = category ? lastPickedByCategory.get(category) : undefined;
  const candidates = last ? pool.filter((p) => p !== last) : pool;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  if (category) lastPickedByCategory.set(category, picked);
  return picked;
}

/** 결과/이벤트 연출에 쓰이는 모든 사진 경로 — 프리로딩용으로 한곳에 모아둔다. */
export const ALL_PICTURES: string[] = [
  ...RESULT_PICTURES.correct,
  ...RESULT_PICTURES.incorrect,
  ...Object.values(EVENT_PICTURES).flat(),
];

let preloaded = false;

/** 가장 먼저, 그리고 가장 자주 뜨는 정답/오답 사진 — 이것만 즉시 받아두면 체감 지연이 없다. */
const EAGER_PICTURES: string[] = [...RESULT_PICTURES.correct, ...RESULT_PICTURES.incorrect];
const IDLE_PICTURES: string[] = ALL_PICTURES.filter((p) => !EAGER_PICTURES.includes(p));

function warm(src: string, priority: "high" | "low") {
  const img = new window.Image();
  // 프리로드가 초기 렌더/폰트 요청과 대역폭을 다투지 않도록 우선순위를 낮춘다.
  img.fetchPriority = priority;
  img.decoding = "async";
  img.src = src;
}

const onIdle: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => window.requestIdleCallback(cb, { timeout: 3000 })
    : (cb) => window.setTimeout(cb, 200);

/**
 * 게임 화면 마운트 시 한 번 호출 — 브라우저 캐시에 미리 올려놔서 연출이 뜰 때 지연 없이 바로 보이게 한다.
 * 결과 사진만 바로 받고, 이벤트 사진(확률적으로만 뜬다)은 브라우저가 한가할 때 낮은 우선순위로 받는다.
 * 그래야 첫 화면 렌더가 프리로드에 밀리지 않는다.
 */
export function preloadPictures() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const src of EAGER_PICTURES) warm(src, "low");
  onIdle(() => {
    for (const src of IDLE_PICTURES) warm(src, "low");
  });
}
