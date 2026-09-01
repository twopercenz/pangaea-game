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

export interface PendingPlay {
  playerId: string;
  card: EffectCard;
  targetPlateId: TargetId | null;
  quiz: QuizCard;
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
  updatedAt: number;
}
