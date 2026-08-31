export type PlateId =
  | "eurasia"
  | "africa"
  | "antarctica_australia"
  | "north_america"
  | "south_america"
  | "india";

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
  targetPlateId: PlateId | null;
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
    plateId: PlateId | null;
  } | null;
  log: string[];
  updatedAt: number;
}
