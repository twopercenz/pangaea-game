"use client";

import { useEffect, useRef, useState } from "react";
import { EffectCard, EffectType, RoomState, TargetId } from "@/lib/types";
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
}: {
  room: RoomState;
  playerId: string;
  onPlayCard: (cardId: string, targetPlateId: TargetId | null) => Promise<RoomState>;
  onAnswer: (answerIndex: number) => Promise<RoomState>;
}) {
  const [screen, setScreen] = useState<ScreenState>("OTHERS_TURN");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<TargetId | null>(null);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawingCard, setDrawingCard] = useState(false);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

  if (!me) return null;

  function goResultThenReset(correct: boolean) {
    setScreen(correct ? "SUCCESS" : "FAIL");
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
          <div className="w-[520px]">
            <PangaeaBoard room={room} selectedPlate={selectedPlate} onSelect={() => {}} selectable={false} />
            <Button
              variant="outline"
              onClick={() => setScreen("SELECT_CARD")}
              className="mt-3 h-auto w-full rounded-xl bg-[var(--panel)] py-3 text-lg font-semibold"
            >
              닫기
            </Button>
          </div>
        </Overlay>
      )}

      {screen === "SELECT_PANGAEA" && (
        <Overlay>
          <div className="w-[560px] space-y-4">
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
            onPick={setPickedOption}
            onSubmit={() => pickedOption !== null && submitAnswer(pickedOption)}
            onGiveUp={() => submitAnswer(-1)}
            busy={busy}
          />
        </Overlay>
      )}

      {(screen === "SUCCESS" || screen === "FAIL") && (
        <ResultFlash correct={screen === "SUCCESS"} />
      )}

      {room.phase === "awaiting-answer" && !iAmAnswering && screen === "OTHERS_TURN" && (
        <p className="text-center text-xs text-[var(--text-dim)]">
          {room.players.find((p) => p.id === room.pendingPlay?.playerId)?.name}님이 퀴즈에 도전 중입니다...
        </p>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
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
              <Button
                key={c.cardId}
                variant="ghost"
                onClick={() => onTapCard(c.cardId)}
                style={{ borderColor: isSelected ? "#ffffff" : myColor }}
                className={`h-auto w-40 flex-col items-start gap-0 whitespace-normal rounded-lg border-2 bg-[var(--panel)] p-4 text-left transition hover:bg-[var(--panel)] ${
                  isSelected ? "scale-105" : "opacity-90 hover:opacity-100"
                }`}
              >
                <div className="text-3xl font-bold text-[var(--text)]">{meta.face}</div>
                <div className="mt-1 text-sm text-[var(--text-dim)]">{meta.label}</div>
              </Button>
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
}: {
  quiz: NonNullable<RoomState["pendingPlay"]>["quiz"];
  picked: number | null;
  onPick: (idx: number) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  busy: boolean;
}) {
  return (
    <Card className="w-[720px] space-y-6 rounded-2xl p-8">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{quiz.category}</p>
      <h2 className="text-xl font-semibold text-[var(--text)]">{quiz.question}</h2>
      <div className="grid grid-cols-2 gap-4">
        {quiz.options.map((opt, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => onPick(idx)}
            style={{ borderColor: picked === idx ? "var(--blue)" : "var(--line)" }}
            className="h-auto justify-start whitespace-normal rounded-lg border-2 bg-black/20 px-5 py-4 text-left text-base font-normal text-[var(--text)] hover:bg-black/30"
          >
            {idx + 1}. {opt}
          </Button>
        ))}
      </div>
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onGiveUp}
          disabled={busy}
          className="h-auto flex-1 rounded-xl py-3 text-lg font-semibold text-[var(--text-dim)] disabled:opacity-40"
        >
          포기
        </Button>
        <Button
          onClick={onSubmit}
          disabled={picked === null || busy}
          className="h-auto flex-1 rounded-xl bg-[var(--blue)] py-3 text-lg font-semibold text-white hover:bg-[var(--blue)]/90 disabled:opacity-40"
        >
          제출
        </Button>
      </div>
    </Card>
  );
}

function ResultFlash({ correct }: { correct: boolean }) {
  const color = correct ? "var(--green-2)" : "#b3455a";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="result-flash absolute inset-0" style={{ background: color }} />
      <div
        className="relative rounded-2xl border-2 px-8 py-5 text-xl font-bold text-white"
        style={{ borderColor: color, background: "rgba(0,0,0,0.55)" }}
      >
        {correct ? "정답!" : "오답..."}
      </div>
    </div>
  );
}
