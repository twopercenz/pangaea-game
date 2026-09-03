"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { EffectCard, EffectType, EventId, GameEvent, RoomState, TargetId } from "@/lib/types";
import { EVENT_PICTURES, RESULT_PICTURES, pickPicture, preloadPictures } from "@/lib/pictures";
import { INCORRECT_SOUND, playSound, preloadSounds } from "@/lib/sounds";
import { PangaeaBoard, SEAT_COLORS } from "@/components/game/board";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 화면 상태 머신 — UI_SPEC.md의 상태 이름을 그대로 코드 상수로 사용한다.
export type ScreenState =
  | "OTHERS_TURN"
  | "TURN_START_MODAL"
  | "MY_TURN"
  | "SELECT_CARD"
  | "BOARD_MODAL"
  | "SELECT_PANGAEA"
  | "ON_QUIZ"
  | "SUCCESS"
  | "FAIL";

const EFFECT_FACE: Record<EffectType, { face: string; label: string }> = {
  forward1: { face: "+1", label: "1칸 전진" },
  forward2: { face: "+2", label: "2칸 전진" },
  allForward1: { face: "전체+1", label: "모든 조각 1칸 전진" },
};

export function GameFlow({
  room,
  playerId,
  onPlayCard,
  onAnswer,
  onPickOption,
}: {
  room: RoomState;
  playerId: string;
  onPlayCard: (cardId: string, targetPlateId: TargetId | null) => Promise<RoomState>;
  onAnswer: (answerIndex: number) => Promise<RoomState>;
  /** 답변자가 보기를 고를 때마다(제출 전) 호출 — 다른 플레이어 화면에 실시간으로 보여주기 위함. 생략 가능. */
  onPickOption?: (optionIndex: number | null) => void;
}) {
  const [screen, setScreen] = useState<ScreenState>("OTHERS_TURN");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<TargetId | null>(null);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawingCard, setDrawingCard] = useState(false);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventPicture, setEventPicture] = useState<string | null>(null);
  const [resultPicture, setResultPicture] = useState<string | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마운트 시점의 lastEvent는 "과거 이벤트"이므로 터뜨리지 않고, 이후 바뀔 때만 새 이벤트로 본다.
  const seenEventId = useRef<string | null>(room.lastEvent?.id ?? null);

  const me = room.players.find((p) => p.id === playerId);
  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];
  const isMyTurn = currentPlayerId === playerId && room.phase === "awaiting-play";
  const iAmAnswering = room.pendingPlay?.playerId === playerId && room.phase === "awaiting-answer";
  const myColor = SEAT_COLORS[room.players.findIndex((p) => p.id === playerId) % SEAT_COLORS.length] ?? SEAT_COLORS[0];

  // OTHERS_TURN(축소 뷰)에서 대기하다가 내 턴이 되면 자동으로 TURN_START_MODAL 진입.
  // 그 외 활성 상태(내가 뭔가 조작 중이던 화면)에서 턴이 내 것이 아니게 되면 안전하게 되돌린다.
  useEffect(() => {
    if (isMyTurn && screen === "OTHERS_TURN") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local screen-state machine to server-driven turn changes (polling), not a render loop
      setScreen("TURN_START_MODAL");
      return;
    }
    const activeStates: ScreenState[] = ["TURN_START_MODAL", "MY_TURN", "SELECT_CARD", "BOARD_MODAL", "SELECT_PANGAEA"];
    if (!isMyTurn && !iAmAnswering && activeStates.includes(screen)) {
      setScreen("OTHERS_TURN");
      setSelectedCard(null);
      setSelectedPlate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-derive on turn/phase change
  }, [isMyTurn, iAmAnswering, room.currentPlayerIndex, room.phase]);

  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    if (eventTimer.current) clearTimeout(eventTimer.current);
  }, []);

  // 결과/이벤트 사진을 미리 브라우저 캐시에 올려둬서, 실제로 뜰 때 로딩 지연이 없게 한다.
  useEffect(() => {
    preloadPictures();
    preloadSounds();
  }, []);

  // 서버(또는 로컬 테스트 룸)에서 새 이벤트가 오면 모두의 화면에 잠깐 띄운다 — 정답자뿐 아니라 관전자도 poll로 감지.
  useEffect(() => {
    const evt = room.lastEvent;
    if (!evt || evt.id === seenEventId.current) return;
    seenEventId.current = evt.id;
    setActiveEvent(evt);
    setEventPicture(pickPicture(EVENT_PICTURES[evt.eventId], evt.eventId));
    if (eventTimer.current) clearTimeout(eventTimer.current);
    eventTimer.current = setTimeout(() => setActiveEvent(null), 2600);
  }, [room.lastEvent]);

  if (!me) return null;

  function goResultThenReset(correct: boolean) {
    setScreen(correct ? "SUCCESS" : "FAIL");
    const resultCategory = correct ? "correct" : "incorrect";
    setResultPicture(pickPicture(RESULT_PICTURES[resultCategory], resultCategory));
    // picture-flash 애니메이션이 완전히 확대/등장하는 시점(1.5s 중 10% = 150ms)에 맞춰 재생.
    if (!correct) setTimeout(() => playSound(INCORRECT_SOUND), 150);
    resultTimer.current = setTimeout(() => {
      setScreen("OTHERS_TURN");
      setSelectedCard(null);
      setSelectedPlate(null);
      setPickedOption(null);
    }, 1500);
  }

  async function submitPlay(target: TargetId | null) {
    if (!selectedCard || busy) return;
    setBusy(true);
    try {
      setDrawingCard(true);
      const updated = await onPlayCard(selectedCard, target);
      void updated;
      setScreen("ON_QUIZ");
      setTimeout(() => setDrawingCard(false), 650);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(idx: number) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await onAnswer(idx);
      goResultThenReset(!!updated.lastAnswer?.correct);
    } finally {
      setBusy(false);
    }
  }

  // 게임 종료는 기존 로직 그대로 — 결과 연출 도중이 아니면 즉시 결과 화면.
  if (room.phase === "finished" && screen !== "SUCCESS" && screen !== "FAIL") {
    return null; // 상위(page)에서 FinishedPanel을 그린다
  }

  const showBoardBase = screen !== "OTHERS_TURN" && screen !== "TURN_START_MODAL";

  return (
    <div className="relative space-y-4">
      {!showBoardBase && (
        <OthersTurnView room={room} playerId={playerId} />
      )}

      {showBoardBase && (
        <MyTurnBase
          room={room}
          me={me}
          myColor={myColor}
          selectedCard={selectedCard}
          drawingCard={drawingCard}
          onTapCard={(cardId) => {
            if (screen !== "MY_TURN") return;
            setSelectedCard(cardId);
            setScreen("SELECT_CARD");
          }}
          selectedPlate={selectedPlate}
          onSelectPlate={setSelectedPlate}
          boardSelectable={screen === "SELECT_PANGAEA"}
        />
      )}

      {screen === "TURN_START_MODAL" && (
        <Overlay>
          <Card className="w-[440px] rounded-2xl p-10 text-center">
            <p className="text-2xl font-semibold">당신 차례입니다</p>
            <Button
              onClick={() => setScreen("MY_TURN")}
              className="mt-8 h-auto w-full rounded-xl bg-[var(--blue)] py-4 text-lg font-semibold text-white hover:bg-[var(--blue)]/90"
            >
              확인
            </Button>
          </Card>
        </Overlay>
      )}

      {screen === "SELECT_CARD" && selectedCard && me.hand.some((c) => c.cardId === selectedCard) && (
        <Overlay>
          <SelectCardPanel
            card={me.hand.find((c) => c.cardId === selectedCard)!}
            onSelect={() => {
              const card = me.hand.find((c) => c.cardId === selectedCard);
              if (card?.type === "allForward1") submitPlay(null);
              else setScreen("SELECT_PANGAEA");
            }}
            onCancel={() => {
              setSelectedCard(null);
              setScreen("MY_TURN");
            }}
            onViewBoard={() => setScreen("BOARD_MODAL")}
          />
        </Overlay>
      )}

      {screen === "BOARD_MODAL" && (
        <Overlay onClose={() => setScreen("SELECT_CARD")}>
          <div className="w-fit">
            <PangaeaBoard room={room} selectedPlate={selectedPlate} onSelect={() => {}} selectable={false} />
            <Button
              variant="outline"
              onClick={() => setScreen("SELECT_CARD")}
              className="mt-4 h-auto w-full rounded-xl bg-[var(--panel)] py-4 text-xl font-semibold"
            >
              닫기
            </Button>
          </div>
        </Overlay>
      )}

      {screen === "SELECT_PANGAEA" && (
        <Overlay>
          <div className="w-fit space-y-4">
            <p className="text-center text-base text-[var(--text-dim)]">이동시킬 조각을 선택하세요</p>
            <PangaeaBoard room={room} selectedPlate={selectedPlate} onSelect={setSelectedPlate} selectable />
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPlate(null);
                  setScreen("SELECT_CARD");
                }}
                className="h-auto flex-1 rounded-xl bg-[var(--panel)] py-3 text-lg font-semibold"
              >
                취소
              </Button>
              <Button
                disabled={!selectedPlate || busy}
                onClick={() => submitPlay(selectedPlate)}
                className="h-auto flex-1 rounded-xl bg-[var(--blue)] py-3 text-lg font-semibold text-white hover:bg-[var(--blue)]/90 disabled:opacity-40"
              >
                선택
              </Button>
            </div>
          </div>
        </Overlay>
      )}

      {screen === "ON_QUIZ" && room.pendingPlay && iAmAnswering && (
        <Overlay>
          <QuizPanel
            quiz={room.pendingPlay.quiz}
            picked={pickedOption}
            onPick={(idx) => {
              setPickedOption(idx);
              onPickOption?.(idx);
            }}
            onSubmit={() => pickedOption !== null && submitAnswer(pickedOption)}
            onGiveUp={() => submitAnswer(-1)}
            busy={busy}
          />
        </Overlay>
      )}

      {(screen === "SUCCESS" || screen === "FAIL") && (
        <ResultFlash correct={screen === "SUCCESS"} picture={resultPicture} />
      )}

      {activeEvent && <EventFlash event={activeEvent} picture={eventPicture} />}

      {room.phase === "awaiting-answer" && !iAmAnswering && room.pendingPlay && (
        <Overlay>
          <QuizPanel
            quiz={room.pendingPlay.quiz}
            picked={room.pendingPlay.selectedOptionIndex}
            onPick={() => {}}
            onSubmit={() => {}}
            onGiveUp={() => {}}
            busy
            readOnly
            solverName={room.players.find((p) => p.id === room.pendingPlay?.playerId)?.name}
          />
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="overlay-scrim fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="sheet-materialize" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function CardBack({ color }: { color: string }) {
  return (
    <div
      className="h-16 w-11 rounded-md border-2"
      style={{ borderColor: color, background: `${color}22` }}
    />
  );
}

function OthersTurnView({ room, playerId }: { room: RoomState; playerId: string }) {
  const opponents = room.players.filter((p) => p.id !== playerId);
  const positions: ("top" | "left" | "right")[] = ["top", "left", "right"];
  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4">
      <div className="space-y-3">
        {/* 상대 손패 — 인원수만큼 상/좌/우에 균등 배치, 항상 4장 뒷면(분홍) */}
        <div className="flex flex-wrap justify-center gap-6">
          {opponents.map((p, i) => (
            <div key={p.id} className="text-center">
              <p
                className="mb-1 text-xs"
                style={{ color: p.id === currentPlayerId ? "var(--blue)" : "var(--text-dim)" }}
              >
                {p.name} {p.id === currentPlayerId && "· 턴"} · {positions[i % 3]}
              </p>
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }, (_, k) => (
                  <CardBack key={k} color="var(--rose)" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <PangaeaBoard room={room} selectedPlate={null} onSelect={() => {}} selectable={false} />

        {/* 내 손패 — 하단, 파랑 뒷면 (내 턴이 아니므로 조작 불가) */}
        <div className="flex justify-center gap-1.5">
          {room.players
            .find((p) => p.id === playerId)
            ?.hand.map((c) => <CardBack key={c.cardId} color={SEAT_COLORS[0]} />)}
        </div>
      </div>

      <DeckColumn />
    </div>
  );
}

function DeckColumn() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border-2 border-[var(--blue)] bg-[var(--blue)]/15 px-3 py-2 text-center text-xs font-semibold text-[var(--text)]">
        퀴즈카드
      </div>
      <div className="rounded-lg border-2 border-[var(--green-1)] bg-[var(--green-1)]/20 px-3 py-2 text-center text-xs font-semibold text-[var(--text)]">
        보상카드
      </div>
    </div>
  );
}

function MyTurnBase({
  room,
  me,
  myColor,
  selectedCard,
  drawingCard,
  onTapCard,
  selectedPlate,
  onSelectPlate,
  boardSelectable,
}: {
  room: RoomState;
  me: RoomState["players"][number];
  myColor: string;
  selectedCard: string | null;
  drawingCard: boolean;
  onTapCard: (cardId: string) => void;
  selectedPlate: TargetId | null;
  onSelectPlate: (id: TargetId) => void;
  boardSelectable: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4">
      <div className="space-y-3">
        <PangaeaBoard room={room} selectedPlate={selectedPlate} onSelect={onSelectPlate} selectable={boardSelectable} />
        <div className="relative flex flex-wrap justify-center gap-4">
          {me.hand.map((c) => {
            const meta = EFFECT_FACE[c.type];
            const isSelected = c.cardId === selectedCard;
            return (
              <HandCard
                key={c.cardId}
                face={meta.face}
                label={meta.label}
                isSelected={isSelected}
                color={myColor}
                onCommit={() => onTapCard(c.cardId)}
              />
            );
          })}
          {drawingCard && (
            <div className="draw-fly pointer-events-none absolute -right-2 -top-6 w-20 rounded-lg border-2 border-[var(--green-1)] bg-[var(--green-1)]/40 p-2 text-center text-[11px] font-semibold text-[var(--text)]">
              보상카드 획득!
            </div>
          )}
        </div>
      </div>
      <DeckColumn />
    </div>
  );
}

/**
 * A hand card the player can lift with a drag, not just tap. Tracks the
 * pointer 1:1 while dragging (Apple, §2), resists past its lift ceiling with
 * rubber-banding (§9), and — whether committed or released early — always
 * springs back from wherever it currently sits, never snapping to a fixed
 * duration (§3/§4). Lifting past the threshold (by distance or by flick
 * velocity) commits the card, mirroring a small tap for players who'd rather
 * just click.
 */
function HandCard({
  face,
  label,
  isSelected,
  color,
  onCommit,
}: {
  face: string;
  label: string;
  isSelected: boolean;
  color: string;
  onCommit: () => void;
}) {
  const y = useMotionValue(0);
  // The lift casts a growing shadow and lightens as it clears the hand —
  // continuous feedback tied to the drag, not just an end-state flourish.
  const shadow = useTransform(y, [-90, 0], ["0 24px 40px -8px rgba(0,0,0,0.6)", "0 2px 6px -2px rgba(0,0,0,0.4)"]);
  const lift = useTransform(y, [-90, 0], [1.06, 1]);

  function settle() {
    // Interrupt-safe: animate() re-targets from the value's current (live)
    // position, so a mid-drag release never jumps.
    animate(y, 0, { type: "spring", stiffness: 420, damping: 32 });
  }

  return (
    <motion.div
      style={{ y, scale: lift, boxShadow: shadow }}
      drag="y"
      dragConstraints={{ top: -90, bottom: 0 }}
      dragElastic={0.35}
      whileTap={{ scale: 1.02 }}
      onDragEnd={(_e, info) => {
        const lifted = info.offset.y < -36 || info.velocity.y < -500;
        settle();
        if (lifted) onCommit();
      }}
      onClick={() => onCommit()}
      className="touch-none cursor-grab rounded-lg active:cursor-grabbing"
    >
      <div
        style={{ borderColor: isSelected ? "#ffffff" : color }}
        className={`flex h-50 w-40 flex-col items-center justify-center gap-1 rounded-lg border-2 bg-[var(--panel)] p-4 text-center select-none ${
          isSelected ? "" : "opacity-90"
        }`}
      >
        <div className="text-3xl font-bold text-[var(--text)]">{face}</div>
        <div className="mt-1 text-sm text-[var(--text-dim)]">{label}</div>
      </div>
    </motion.div>
  );
}

function SelectCardPanel({
  card,
  onSelect,
  onCancel,
  onViewBoard,
}: {
  card: EffectCard;
  onSelect: () => void;
  onCancel: () => void;
  onViewBoard: () => void;
}) {
  const meta = EFFECT_FACE[card.type];
  return (
    <Card className="w-[520px] space-y-6 rounded-2xl border-2 border-[var(--blue)] p-12 text-center">
      <div className="text-8xl font-bold text-[var(--text)]">{meta.face}</div>
      <p className="text-lg text-[var(--text-dim)]">{meta.label}</p>
      <div className="flex flex-col gap-3">
        <Button onClick={onSelect} className="h-auto rounded-xl bg-[var(--blue)] py-4 text-lg font-semibold text-white hover:bg-[var(--blue)]/90">
          선택
        </Button>
        <Button
          variant="outline"
          onClick={onViewBoard}
          className="h-auto rounded-xl bg-transparent py-4 text-lg font-semibold"
        >
          판 보기
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="h-auto rounded-xl border border-[var(--line)] bg-transparent py-4 text-lg font-semibold text-[var(--text-dim)] hover:bg-transparent"
        >
          취소
        </Button>
      </div>
    </Card>
  );
}

function QuizPanel({
  quiz,
  picked,
  onPick,
  onSubmit,
  onGiveUp,
  busy,
  readOnly,
  solverName,
}: {
  quiz: NonNullable<RoomState["pendingPlay"]>["quiz"];
  picked: number | null;
  onPick: (idx: number) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  busy: boolean;
  /** true면 관전자용 — 보기만 하고 고를 수 없다. */
  readOnly?: boolean;
  /** readOnly일 때 "OO님이 퀴즈 도전 중" 안내에 쓸 이름. */
  solverName?: string;
}) {
  return (
    <Card className="w-[980px] space-y-8 rounded-2xl p-12">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-eyebrow uppercase text-[var(--text-dim)]">{quiz.category}</p>
        {readOnly && (
          <p className="text-sm font-semibold text-[var(--blue)]">{solverName}님이 퀴즈 도전 중...</p>
        )}
      </div>
      <h2 className="text-display text-[var(--text)]">{quiz.question}</h2>
      <div className="grid grid-cols-2 gap-5">
        {quiz.options.map((opt, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => !readOnly && onPick(idx)}
            disabled={readOnly}
            style={{ borderColor: picked === idx ? "var(--blue)" : "var(--line)" }}
            className="h-auto justify-start whitespace-normal rounded-lg border-2 bg-black/20 px-6 py-6 text-left text-xl font-normal text-[var(--text)] hover:bg-black/30 disabled:opacity-100"
          >
            {idx + 1}. {opt}
          </Button>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onGiveUp}
            disabled={busy}
            className="h-auto flex-1 rounded-xl py-5 text-xl font-semibold text-[var(--text-dim)] disabled:opacity-40"
          >
            포기
          </Button>
          <Button
            onClick={onSubmit}
            disabled={picked === null || busy}
            className="h-auto flex-1 rounded-xl bg-[var(--blue)] py-5 text-xl font-semibold text-white hover:bg-[var(--blue)]/90 disabled:opacity-40"
          >
            제출
          </Button>
        </div>
      )}
    </Card>
  );
}

// 정답/오답 연출 — 모달 없이 색 플래시 + 사진(빠르게 떴다 천천히 사라짐)만 보여준다.
function ResultFlash({ correct, picture }: { correct: boolean; picture: string | null }) {
  const color = correct ? "var(--green-2)" : "#b3455a";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="result-flash absolute inset-0" style={{ background: color }} />
      {picture && (
        // eslint-disable-next-line @next/next/no-img-element -- public/pictures 아래 임의 파일명이라 next/image 최적화 대상이 아님
        <img src={picture} alt="" className="picture-flash relative max-h-[70vh] w-auto object-contain drop-shadow-2xl" />
      )}
    </div>
  );
}

const EVENT_ICON: Record<EventId, string> = {
  meteor_strike: "☄️",
  mass_extinction: "💀",
  ice_age: "🥶",
  species_boom: "🌿",
  volcanic_boost: "🌋",
  continental_surge: "🌍",
};

/** 정답/오답 시 확률적으로 터지는 이벤트 연출 — 모든 플레이어(관전자 포함) 화면에 뜬다. */
function EventFlash({ event, picture }: { event: GameEvent; picture: string | null }) {
  const color = event.good ? "var(--green-2)" : "var(--rose)";
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div className="result-flash absolute inset-0" style={{ background: color }} />
      <div
        className="relative flex max-w-xl flex-col items-center gap-3 rounded-2xl border-2 px-10 py-8 text-center"
        style={{ borderColor: color, background: "rgba(0,0,0,0.75)" }}
      >
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- public/pictures 아래 임의 파일명이라 next/image 최적화 대상이 아님
          <img src={picture} alt="" className="max-h-72 w-auto rounded-xl object-contain" />
        ) : (
          <div className="text-6xl">{EVENT_ICON[event.eventId]}</div>
        )}
        <p className="text-2xl font-bold text-white">
          {event.good ? "✨ " : "⚠️ "}
          {event.nameKo}
        </p>
        <p className="text-base text-white/80">{event.description}</p>
      </div>
    </div>
  );
}
