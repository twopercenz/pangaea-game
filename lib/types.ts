export type PlateId =
  | "eurasia"
  | "africa"
  | "antarctica_australia"
  | "north_america"
  | "south_america"
  | "india";

/** 조각이 1차로 뭉쳐 만드는 두 초대륙 */
export type SuperContinentId = "laurasia" | "gondwana";

/** 카드가 겨냥할 수 있는 대상: 1단계는 개별 조각, 2단계는 판게아 합체 트랙 하나뿐 */
export type TargetId = PlateId | "pangaea";

/** 게임 진행 단계 — 조각을 모아 두 초대륙을 만드는 단계 → 둘을 충돌시키는 단계 */
export type Stage = "assemble" | "merge";

export interface PlateDef {
  id: PlateId;
  nameKo: string;
  points: number;
  trackLength: number;
  flavor: string;
}

export interface PlateState {
  id: PlateId;
  progress: number; // 0..trackLength
  completedBy: string | null; // playerId
}

export interface SuperContinentDef {
  id: SuperContinentId;
  nameKo: string;
  members: PlateId[];
  /** 마지막 조각을 붙인 플레이어가 받는 완성 보너스 */
  bonus: number;
  flavor: string;
}

export interface SuperContinentState {
  id: SuperContinentId;
  completedBy: string | null; // 마지막 조각을 붙여 초대륙을 완성한 playerId
}

/** 2단계: 로라시아와 곤드와나 사이 테티스 해를 닫는 공용 트랙 */
export interface MergeState {
  progress: number; // 0..MERGE_DEF.trackLength
  completedBy: string | null;
}

export type EffectType = "forward1" | "forward2" | "allForward1";

export interface EffectCard {
  cardId: string;
  type: EffectType;
}

export interface QuizCard {
  quizId: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface Player {
  id: string;
  name: string;
  hand: EffectCard[];
  score: number;
  connected: boolean;
}

export type RoomPhase = "lobby" | "awaiting-play" | "awaiting-answer" | "finished";

/** 정답/오답 시 확률적으로 터지는 지질학적 이벤트 — 좋은 효과/나쁜 효과 둘 다 있다. */
export type EventId =
  | "meteor_strike"
  | "mass_extinction"
  | "ice_age"
  | "species_boom"
  | "volcanic_boost"
  | "continental_surge";

export interface GameEvent {
  /** 매 발생마다 유일한 id — 클라이언트가 "새 이벤트인지" 판별하는 용도. */
  id: string;
  eventId: EventId;
  good: boolean;
  nameKo: string;
  description: string;
}

export interface PendingPlay {
  playerId: string;
  card: EffectCard;
  targetPlateId: TargetId | null;
  quiz: QuizCard;
  /** 답변자가 아직 제출 전 고르고 있는 보기 — 다른 플레이어에게도 실시간으로 보여준다. */
  selectedOptionIndex: number | null;
}

export interface RoomState {
  code: string;
  createdAt: number;
  hostId: string;
  players: Player[];
  turnOrder: string[];
  currentPlayerIndex: number;
  plates: PlateState[];
  superContinents: SuperContinentState[];
  merge: MergeState;
  effectDeck: EffectCard[];
  effectDiscard: EffectCard[];
  quizQueue: QuizCard[];
  phase: RoomPhase;
  pendingPlay: PendingPlay | null;
  lastAnswer: {
    playerId: string;
    correct: boolean;
    quizQuestion: string;
    correctAnswerText: string;
    cardType: EffectType;
    plateId: TargetId | null;
  } | null;
  log: string[];
  /** 가장 최근에 터진 이벤트 — 클라이언트가 연출을 보여주는 데만 쓰고, 없으면 null. */
  lastEvent: GameEvent | null;
  updatedAt: number;
}

/**
 * 클라이언트에 실제로 내려보내는 방 상태. 화면이 전혀 쓰지 않는 서버 전용 필드
 * (퀴즈 은행 전체 quizQueue, 효과 덱/버림더미, 서버 로그)를 뺀 형태다.
 * - 폴링 응답이 매번 10KB 넘게 커지는 걸 막고,
 * - quizQueue에 들어 있던 모든 문제의 correctIndex가 네트워크로 새어 나가는 것도 막는다.
 */
export type ClientRoomState = Omit<
  RoomState,
  "quizQueue" | "effectDeck" | "effectDiscard" | "log"
>;
