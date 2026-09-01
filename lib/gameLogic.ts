import { MERGE_DEF, PLATE_DEFS, SUPER_DEFS, SUPER_MAP, SUPER_OF_PLATE } from "./plates";
import { QUIZ_BANK } from "./quizBank";
import {
  EffectCard,
  EffectType,
  Player,
  PlateState,
  QuizCard,
  RoomState,
  Stage,
  TargetId,
} from "./types";

/** 6조각이 모두 완성되면 두 초대륙이 완성된 것이므로, 판게아 합체 단계로 넘어간다. */
export function stageOf(room: RoomState): Stage {
  return room.plates.every((p) => p.completedBy) ? "merge" : "assemble";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let cardCounter = 0;
function makeEffectCard(type: EffectType): EffectCard {
  cardCounter += 1;
  return { cardId: `eff-${Date.now()}-${cardCounter}`, type };
}

// 효과 카드 구성: 1칸 전진 x10, 2칸 전진 x6, 전체 1칸 전진 x4
function buildEffectDeck(): EffectCard[] {
  const deck: EffectCard[] = [
    ...Array.from({ length: 10 }, () => makeEffectCard("forward1")),
    ...Array.from({ length: 6 }, () => makeEffectCard("forward2")),
    ...Array.from({ length: 4 }, () => makeEffectCard("allForward1")),
  ];
  return shuffle(deck);
}

export function drawEffectCard(room: RoomState): EffectCard {
  if (room.effectDeck.length === 0) {
    if (room.effectDiscard.length === 0) {
      room.effectDeck = buildEffectDeck();
    } else {
      room.effectDeck = shuffle(room.effectDiscard);
      room.effectDiscard = [];
    }
  }
  return room.effectDeck.pop()!;
}

export function drawQuiz(room: RoomState): QuizCard {
  const q = room.quizQueue.shift()!;
  room.quizQueue.push(q); // 정답 여부와 상관없이 맨 아래로
  return q;
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function createRoom(hostName: string): RoomState {
  const hostId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plates: PlateState[] = PLATE_DEFS.map((p) => ({
    id: p.id,
    progress: 0,
    completedBy: null,
  }));

  const room: RoomState = {
    code: makeCode(),
    createdAt: Date.now(),
    hostId,
    players: [
      { id: hostId, name: hostName || "플레이어1", hand: [], score: 0, connected: true },
    ],
    turnOrder: [hostId],
    currentPlayerIndex: 0,
    plates,
    superContinents: SUPER_DEFS.map((s) => ({ id: s.id, completedBy: null })),
    merge: { progress: 0, completedBy: null },
    effectDeck: buildEffectDeck(),
    effectDiscard: [],
    quizQueue: shuffle(QUIZ_BANK),
    phase: "lobby",
    pendingPlay: null,
    lastAnswer: null,
    log: ["방이 생성되었습니다. 먼저 로라시아와 곤드와나를 만드세요."],
    updatedAt: Date.now(),
  };
  return room;
}

export function joinRoom(room: RoomState, name: string): Player {
  if (room.phase !== "lobby") {
    throw new Error("이미 시작된 게임에는 참가할 수 없습니다.");
  }
  if (room.players.length >= 4) {
    throw new Error("방이 가득 찼습니다 (최대 4명).");
  }
  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const player: Player = { id, name: name || `플레이어${room.players.length + 1}`, hand: [], score: 0, connected: true };
  room.players.push(player);
  room.turnOrder.push(id);
  room.log.push(`${player.name}님이 입장했습니다.`);
  room.updatedAt = Date.now();
  return player;
}

export function startGame(room: RoomState) {
  if (room.players.length < 2) {
    throw new Error("최소 2명이 있어야 시작할 수 있습니다.");
  }
  if (room.phase !== "lobby") {
    throw new Error("이미 시작되었습니다.");
  }
  for (const player of room.players) {
    player.hand = Array.from({ length: 4 }, () => drawEffectCard(room));
  }
  room.phase = "awaiting-play";
  room.currentPlayerIndex = 0;
  room.log.push("게임이 시작되었습니다!");
  room.updatedAt = Date.now();
}

// 정답 인덱스는 답변 당사자를 제외한 다른 클라이언트에는 숨긴다 (네트워크 탭으로 컨닝 방지)
export function sanitizeRoomForPlayer(room: RoomState, viewerId: string | null): RoomState {
  if (!room.pendingPlay) return room;
  if (viewerId === room.pendingPlay.playerId) return room;
  return {
    ...room,
    pendingPlay: {
      ...room.pendingPlay,
      quiz: { ...room.pendingPlay.quiz, correctIndex: -1 as unknown as 0 },
    },
  };
}

function currentPlayer(room: RoomState): Player {
  const id = room.turnOrder[room.currentPlayerIndex];
  return room.players.find((p) => p.id === id)!;
}

export function playCard(room: RoomState, playerId: string, cardId: string, targetPlateId: TargetId | null) {
  if (room.phase !== "awaiting-play") throw new Error("지금은 카드를 낼 수 없습니다.");
  const player = currentPlayer(room);
  if (player.id !== playerId) throw new Error("당신의 턴이 아닙니다.");

  const cardIdx = player.hand.findIndex((c) => c.cardId === cardId);
  if (cardIdx === -1) throw new Error("해당 카드를 갖고 있지 않습니다.");
  const card = player.hand[cardIdx];

  const stage = stageOf(room);
  if (card.type !== "allForward1") {
    if (!targetPlateId) throw new Error("이동시킬 대상을 선택해야 합니다.");
    if (stage === "merge") {
      // 조각은 전부 제자리를 찾았고, 남은 건 두 초대륙을 붙이는 일뿐이다.
      if (targetPlateId !== "pangaea") throw new Error("이제 남은 것은 판게아 합체뿐입니다.");
      if (room.merge.completedBy) throw new Error("판게아는 이미 완성되었습니다.");
    } else {
      if (targetPlateId === "pangaea") {
        throw new Error("로라시아와 곤드와나를 먼저 완성해야 합체할 수 있습니다.");
      }
      const plate = room.plates.find((p) => p.id === targetPlateId);
      if (!plate) throw new Error("잘못된 조각입니다.");
      if (plate.completedBy) throw new Error("이미 완성된 조각입니다.");
    }
  }

  // 카드를 낸다 (아직 발동 안 함), 손패에서 제거하고 즉시 보충
  player.hand.splice(cardIdx, 1);
  room.effectDiscard.push(card);
  player.hand.push(drawEffectCard(room));

  const quiz = drawQuiz(room);
  room.pendingPlay = {
    playerId: player.id,
    card,
    targetPlateId: card.type === "allForward1" ? (stage === "merge" ? "pangaea" : null) : targetPlateId,
    quiz,
  };
  room.phase = "awaiting-answer";
  room.log.push(`${player.name}님이 카드를 내고 퀴즈에 도전합니다.`);
  room.updatedAt = Date.now();
}

const EFFECT_LABEL: Record<EffectType, string> = {
  forward1: "1칸 전진",
  forward2: "2칸 전진",
  allForward1: "전체 조각 1칸 전진",
};

function applyCompletionCheck(room: RoomState, plate: PlateState, def = PLATE_DEFS.find((d) => d.id === plate.id)!, byPlayerId: string) {
  if (plate.completedBy || plate.progress < def.trackLength) return;
  plate.progress = def.trackLength;
  plate.completedBy = byPlayerId;
  const player = room.players.find((p) => p.id === byPlayerId)!;
  player.score += def.points;
  room.log.push(`${def.nameKo} 조각이 제자리를 찾았습니다! ${player.name}님이 ${def.points}점을 획득했습니다.`);
  applySuperContinentCheck(room, plate.id, byPlayerId);
}

// 마지막 조각을 붙여 초대륙(로라시아/곤드와나)을 완성하면 보너스를 준다.
function applySuperContinentCheck(room: RoomState, plateId: PlateState["id"], byPlayerId: string) {
  const superDef = SUPER_MAP[SUPER_OF_PLATE[plateId]];
  const superState = room.superContinents.find((s) => s.id === superDef.id)!;
  if (superState.completedBy) return;
  const allMembersDone = superDef.members.every(
    (m) => room.plates.find((p) => p.id === m)?.completedBy
  );
  if (!allMembersDone) return;

  superState.completedBy = byPlayerId;
  const player = room.players.find((p) => p.id === byPlayerId)!;
  player.score += superDef.bonus;
  room.log.push(
    `${superDef.nameKo}가 완성되었습니다! ${player.name}님이 보너스 ${superDef.bonus}점을 받습니다.`
  );

  if (room.superContinents.every((s) => s.completedBy)) {
    room.log.push("로라시아와 곤드와나가 모두 모였습니다 — 이제 테티스 해를 닫아 판게아를 완성하세요!");
  }
}

// 2단계: 테티스 해를 닫아 두 초대륙을 충돌시킨다.
function advanceMerge(room: RoomState, amount: number, byPlayerId: string) {
  if (room.merge.completedBy) return;
  room.merge.progress = Math.min(room.merge.progress + amount, MERGE_DEF.trackLength);
  if (room.merge.progress < MERGE_DEF.trackLength) return;

  room.merge.completedBy = byPlayerId;
  const player = room.players.find((p) => p.id === byPlayerId)!;
  player.score += MERGE_DEF.points;
  room.log.push(
    `두 초대륙이 충돌해 ${MERGE_DEF.nameKo}가 완성되었습니다! ${player.name}님이 ${MERGE_DEF.points}점을 획득했습니다.`
  );
}

export function answerQuiz(room: RoomState, playerId: string, answerIndex: number) {
  if (room.phase !== "awaiting-answer" || !room.pendingPlay) throw new Error("지금은 답변할 수 없습니다.");
  const { pendingPlay } = room;
  if (pendingPlay.playerId !== playerId) throw new Error("당신의 턴이 아닙니다.");

  const player = room.players.find((p) => p.id === playerId)!;
  const correct = pendingPlay.quiz.correctIndex === answerIndex;

  // 효과 적용 로그(조각/초대륙/판게아 완성)보다 정오답이 먼저 찍히도록 여기서 남긴다.
  room.log.push(
    correct
      ? `${player.name}님 정답! (${EFFECT_LABEL[pendingPlay.card.type]} 적용)`
      : `${player.name}님 오답... 효과가 적용되지 않았습니다.`
  );

  if (correct) {
    const amount = pendingPlay.card.type === "forward2" ? 2 : 1;
    if (pendingPlay.targetPlateId === "pangaea") {
      advanceMerge(room, amount, playerId);
    } else if (pendingPlay.card.type === "allForward1") {
      // 합체 단계의 전체 전진 카드는 playCard에서 "pangaea"로 지정되므로 여기는 조립 단계뿐이다.
      for (const plate of room.plates) {
        if (plate.completedBy) continue;
        const def = PLATE_DEFS.find((d) => d.id === plate.id)!;
        plate.progress = Math.min(plate.progress + 1, def.trackLength);
        applyCompletionCheck(room, plate, def, playerId);
      }
    } else {
      const plate = room.plates.find((p) => p.id === pendingPlay.targetPlateId)!;
      const def = PLATE_DEFS.find((d) => d.id === plate.id)!;
      plate.progress = Math.min(plate.progress + amount, def.trackLength);
      applyCompletionCheck(room, plate, def, playerId);
    }
  }

  room.lastAnswer = {
    playerId,
    correct,
    quizQuestion: pendingPlay.quiz.question,
    correctAnswerText: pendingPlay.quiz.options[pendingPlay.quiz.correctIndex],
    cardType: pendingPlay.card.type,
    plateId: pendingPlay.targetPlateId,
  };
  room.pendingPlay = null;

  if (room.merge.completedBy) {
    room.phase = "finished";
    room.log.push("판게아가 완성되었습니다! 게임 종료.");
  } else {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.turnOrder.length;
    room.phase = "awaiting-play";
  }
  room.updatedAt = Date.now();
}
