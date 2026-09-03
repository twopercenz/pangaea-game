import { EventId } from "./types";

// public/pictures/ 아래 정적 이미지 목록 — 카테고리별로 랜덤 하나를 뽑아 결과/이벤트 연출에 쓴다.
// 새 사진을 추가할 때는 해당 폴더에 파일을 넣고 이 배열에도 경로를 추가하면 된다.

export const RESULT_PICTURES: Record<"correct" | "incorrect", string[]> = {
  correct: [
    "/pictures/fail_or_success/correct/1.png",
    "/pictures/fail_or_success/correct/2.png",
    "/pictures/fail_or_success/correct/3.png",
    "/pictures/fail_or_success/correct/4.png",
  ],
  incorrect: [
    "/pictures/fail_or_success/incorrect/1.png",
    "/pictures/fail_or_success/incorrect/2.png",
    "/pictures/fail_or_success/incorrect/3.png",
    "/pictures/fail_or_success/incorrect/4.png",
    "/pictures/fail_or_success/incorrect/5.png",
    "/pictures/fail_or_success/incorrect/6.png",
    "/pictures/fail_or_success/incorrect/7.png",
  ],
};

export const EVENT_PICTURES: Record<EventId, string[]> = {
  meteor_strike: [
    "/pictures/event/meteor_strike/1.png",
    "/pictures/event/meteor_strike/2.png",
    "/pictures/event/meteor_strike/3.png",
    "/pictures/event/meteor_strike/4.png",
  ],
  mass_extinction: [
    "/pictures/event/mass_extinction/1.png",
    "/pictures/event/mass_extinction/2.png",
    "/pictures/event/mass_extinction/3.png",
    "/pictures/event/mass_extinction/4.png",
    "/pictures/event/mass_extinction/5.png",
  ],
  ice_age: ["/pictures/event/ice_age/1.png"],
  species_boom: ["/pictures/event/species_boom/1.png", "/pictures/event/species_boom/2.png"],
  volcanic_boost: ["/pictures/event/volcanic_boost/1.png"],
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

/** 게임 화면 마운트 시 한 번 호출 — 브라우저 캐시에 미리 올려놔서 연출이 뜰 때 지연 없이 바로 보이게 한다. */
export function preloadPictures() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const src of ALL_PICTURES) {
    const img = new window.Image();
    img.src = src;
  }
}
