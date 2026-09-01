"use client";

import { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, playCard, answerQuiz } from "@/lib/gameLogic";
import { RoomState, TargetId } from "@/lib/types";
import {
  ScoreBoard,
  PangaeaBoard,
  HandPanel,
  QuizPanel,
  FinishedPanel,
  SEAT_COLORS,
} from "@/app/room/[code]/page";

// 실제 API/서버 없이 lib/gameLogic을 브라우저에서 직접 돌려서 혼자 모든 좌석을 오가며
// UI를 확인할 수 있는 개발용 테스트 페이지. /room/[code]와 같은 컴포넌트를 재사용한다.

function freshRoom(playerCount: number): RoomState {
  const room = createRoom("테스터1");
  for (let i = 2; i <= playerCount; i++) joinRoom(room, `테스터${i}`);
  startGame(room);
  return room;
}

export default function TestUiPage() {
  const [playerCount, setPlayerCount] = useState(3);
  // 카드/문제 셔플이 Math.random을 쓰므로 서버에서 미리 만들면 클라이언트와 값이 달라져
  // 하이드레이션 불일치가 난다. room은 마운트 이후 클라이언트에서만 생성한다.
  const [room, setRoom] = useState<RoomState | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<TargetId | null>(null);
  const [error, setError] = useState("");

  function reset(count = playerCount) {
    const next = freshRoom(count);
    setRoom(next);
    setViewingPlayerId(next.players[0].id);
    setSelectedCard(null);
    setSelectedPlate(null);
    setError("");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only initial random game setup
    reset(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  if (!room || !viewingPlayerId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08080d] text-white/40">
        <p>테스트 게임 준비 중...</p>
      </main>
    );
  }
  // 위 가드로 room/viewingPlayerId는 non-null이지만, 아래 클로저에서는 재검사가 필요해
  // 별도 상수로 좁혀서 재사용한다.
  const activeRoom = room;
  const activePlayerId = viewingPlayerId;

  function withErrorHandling(fn: () => void) {
    try {
      fn();
      setRoom({ ...activeRoom });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handlePlayCard() {
    if (!selectedCard) return;
    const card = activeRoom.players.find((p) => p.id === activePlayerId)?.hand.find((c) => c.cardId === selectedCard);
    if (!card) return;
    if (card.type !== "allForward1" && !selectedPlate) {
      setError("이동시킬 대상을 먼저 선택하세요.");
      return;
    }
    withErrorHandling(() => playCard(activeRoom, activePlayerId, selectedCard, selectedPlate));
    setSelectedCard(null);
    setSelectedPlate(null);
  }

  function handleAnswer(idx: number) {
    if (!activeRoom.pendingPlay) return;
    withErrorHandling(() => answerQuiz(activeRoom, activeRoom.pendingPlay!.playerId, idx));
  }

  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];
  const isMyTurn = currentPlayerId === viewingPlayerId;
  const pending = room.pendingPlay;
  const iAmAnswering = pending?.playerId === viewingPlayerId;
  const viewer = room.players.find((p) => p.id === viewingPlayerId)!;
  const myColor = SEAT_COLORS[room.players.findIndex((p) => p.id === viewingPlayerId) % SEAT_COLORS.length];
  const pickedCard = viewer.hand.find((c) => c.cardId === selectedCard) ?? null;
  const needsTarget = !!pickedCard && pickedCard.type !== "allForward1";

  return (
    <main className="min-h-screen bg-[#08080d] p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-5 py-3 text-sm text-[#f59e0b]">
          🧪 UI 테스트 전용 페이지 — 서버/다른 플레이어 없이 혼자 모든 좌석을 오가며 화면을 확인할 수 있습니다.
          실제 방과는 무관하며 새로고침하면 초기화됩니다.
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] px-5 py-4">
          <span className="text-sm text-white/50">인원 수</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => {
                setPlayerCount(n);
                reset(n);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                playerCount === n ? "border-[#f59e0b] text-[#f59e0b]" : "border-white/10 text-white/60"
              }`}
            >
              {n}명
            </button>
          ))}
          <button
            onClick={() => reset()}
            className="ml-auto rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
          >
            게임 다시 시작
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#1a1a1a] px-5 py-4">
          <span className="text-sm text-white/50">시점 전환 (내가 이 플레이어인 척 보기)</span>
          {room.players.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setViewingPlayerId(p.id);
                setSelectedCard(null);
                setSelectedPlate(null);
                setError("");
              }}
              style={{ borderColor: viewingPlayerId === p.id ? SEAT_COLORS[i % SEAT_COLORS.length] : "rgba(255,255,255,0.1)" }}
              className="rounded-lg border bg-black/30 px-3 py-1.5 text-sm"
            >
              <span style={{ color: SEAT_COLORS[i % SEAT_COLORS.length] }}>{p.name}</span>
              {p.id === currentPlayerId && <span className="ml-1 text-white/40">(턴)</span>}
            </button>
          ))}
        </div>

        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">판게아 — 테스트 방</h1>
            <p className="text-sm text-white/40">
              지금 보는 시점: <b className="text-white">{viewer.name}</b> ·{" "}
              {room.phase === "awaiting-play" && `${room.players.find((p) => p.id === currentPlayerId)?.name}님의 턴`}
              {room.phase === "awaiting-answer" && `${room.players.find((p) => p.id === pending?.playerId)?.name}님 퀴즈 도전 중`}
              {room.phase === "finished" && "게임 종료!"}
            </p>
          </div>
          <ScoreBoard room={room} currentPlayerId={currentPlayerId} />
        </header>

        {error && (
          <div className="rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 px-4 py-2 text-sm text-[#f43f5e]">
            {error}
          </div>
        )}

        <PangaeaBoard
          room={room}
          selectedPlate={selectedPlate}
          onSelect={setSelectedPlate}
          selectable={isMyTurn && room.phase === "awaiting-play" && needsTarget}
        />

        {room.lastAnswer && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              room.lastAnswer.correct
                ? "border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]"
                : "border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e]"
            }`}
          >
            {room.players.find((p) => p.id === room.lastAnswer!.playerId)?.name}님 —{" "}
            {room.lastAnswer.correct ? "정답!" : `오답 (정답: ${room.lastAnswer.correctAnswerText})`}
          </div>
        )}

        {room.phase === "finished" && <FinishedPanel room={room} />}

        {room.phase === "awaiting-answer" && pending && (
          <QuizPanel
            pending={pending}
            canAnswer={iAmAnswering}
            answering={false}
            answererName={room.players.find((p) => p.id === pending.playerId)?.name ?? ""}
            onAnswer={handleAnswer}
          />
        )}

        {room.phase === "awaiting-play" && (
          <HandPanel
            hand={viewer.hand}
            isMyTurn={isMyTurn}
            selectedCard={selectedCard}
            seatColor={myColor}
            onSelectCard={(id) => {
              setSelectedCard(id === selectedCard ? null : id);
              setSelectedPlate(null);
            }}
            selectedPlate={selectedPlate}
            onPlay={handlePlayCard}
          />
        )}
      </div>
    </main>
  );
}
