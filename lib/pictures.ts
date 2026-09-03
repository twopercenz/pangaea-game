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

export function pickPicture(pool: string[]): string | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
