import { PlateDef, PlateId } from "./types";

export const PLATE_DEFS: PlateDef[] = [
  {
    id: "eurasia",
    nameKo: "유라시아",
    points: 6,
    trackLength: 6,
    flavor: "로라시아의 동쪽 조각 — 가장 큰 땅덩어리",
  },
  {
    id: "africa",
    nameKo: "아프리카",
    points: 5,
    trackLength: 5,
    flavor: "곤드와나의 중심 — 거의 모든 조각과 맞닿는 핵심 조각",
  },
  {
    id: "antarctica_australia",
    nameKo: "남극-오스트레일리아",
    points: 5,
    trackLength: 5,
    flavor: "초대륙 남쪽 기반을 이루는 넓은 조각",
  },
  {
    id: "north_america",
    nameKo: "북아메리카",
    points: 4,
    trackLength: 4,
    flavor: "로라시아의 서쪽 조각 — 그린란드로 유라시아와 이어짐",
  },
  {
    id: "south_america",
    nameKo: "남아메리카",
    points: 3,
    trackLength: 4,
    flavor: "브라질 해안선이 아프리카 기니만과 정확히 맞물림",
  },
  {
    id: "india",
    nameKo: "인도",
    points: 2,
    trackLength: 3,
    flavor: "가장 빠르고 멀리 이동해 아시아와 충돌, 히말라야를 만든 조각",
  },
];

export const PLATE_MAP: Record<PlateId, PlateDef> = Object.fromEntries(
  PLATE_DEFS.map((p) => [p.id, p])
) as Record<PlateId, PlateDef>;
