import { PlateDef, PlateId, SuperContinentDef, SuperContinentId } from "./types";

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

// 1단계: 조각들은 곧장 판게아가 되지 않고, 먼저 북쪽 로라시아 / 남쪽 곤드와나로 뭉친다.
export const SUPER_DEFS: SuperContinentDef[] = [
  {
    id: "laurasia",
    nameKo: "로라시아",
    members: ["north_america", "eurasia"],
    bonus: 3,
    flavor: "북쪽 초대륙 — 북아메리카와 유라시아가 그린란드를 통해 이어진다",
  },
  {
    id: "gondwana",
    nameKo: "곤드와나",
    members: ["africa", "south_america", "india", "antarctica_australia"],
    bonus: 4,
    flavor: "남쪽 초대륙 — 아프리카를 중심으로 남반구 조각들이 맞물린다",
  },
];

export const SUPER_MAP: Record<SuperContinentId, SuperContinentDef> = Object.fromEntries(
  SUPER_DEFS.map((s) => [s.id, s])
) as Record<SuperContinentId, SuperContinentDef>;

/** 각 조각이 속한 초대륙 */
export const SUPER_OF_PLATE: Record<PlateId, SuperContinentId> = Object.fromEntries(
  SUPER_DEFS.flatMap((s) => s.members.map((m) => [m, s.id]))
) as Record<PlateId, SuperContinentId>;

// 2단계: 두 초대륙 사이의 테티스 해를 닫는 공용 트랙.
export const MERGE_DEF = {
  nameKo: "판게아",
  trackLength: 6,
  points: 6,
  flavor: "테티스 해가 닫히며 로라시아와 곤드와나가 하나의 초대륙으로 충돌한다",
} as const;
