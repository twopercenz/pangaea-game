"use client";

import { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, playCard, answerQuiz, pickOption } from "@/lib/gameLogic";
import { RoomState, TargetId } from "@/lib/types";
import { ScoreBoard, FinishedPanel, SEAT_COLORS } from "@/components/game/board";
import { GameFlow } from "@/components/game/flow";
import { CanvasScale } from "@/components/game/CanvasScale";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 실제 API/서버 없이 lib/gameLogic을 브라우저에서 직접 돌려서 혼자 모든 좌석을 오가며
// UI를 확인할 수 있는 개발용 테스트 페이지.

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
  const [error, setError] = useState("");

  function reset(count = playerCount) {
    const next = freshRoom(count);
    setRoom(next);
    setViewingPlayerId(next.players[0].id);
    setError("");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only initial random game setup
    reset(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  if (!room || !viewingPlayerId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-dim)]">
        <p>테스트 게임 준비 중...</p>
      </main>
    );
  }
  const activeRoom = room;
  const activePlayerId = viewingPlayerId;

  async function handlePlayCard(cardId: string, targetPlateId: TargetId | null): Promise<RoomState> {
    try {
      playCard(activeRoom, activePlayerId, cardId, targetPlateId);
      const next = { ...activeRoom };
      setRoom(next);
      setError("");
      return next;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }

  async function handleAnswer(idx: number): Promise<RoomState> {
    if (!activeRoom.pendingPlay) return activeRoom;
    try {
      answerQuiz(activeRoom, activeRoom.pendingPlay.playerId, idx);
      const next = { ...activeRoom };
      setRoom(next);
      setError("");
      return next;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }

  function handlePickOption(idx: number | null) {
    if (!activeRoom.pendingPlay) return;
    pickOption(activeRoom, activeRoom.pendingPlay.playerId, idx);
    setRoom({ ...activeRoom });
  }

  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];
  const pending = room.pendingPlay;
  const viewer = room.players.find((p) => p.id === viewingPlayerId)!;

  return (
    <main className="flex h-screen w-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      {/* 개발용 컨트롤 — 한 줄로 압축, 실제 게임 화면 비율에 영향 안 주게 얇게 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm">
        <span className="text-[var(--blue)]">🧪 테스트</span>

        <span className="text-[var(--text-dim)]">인원</span>
        {[2, 3, 4].map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            onClick={() => {
              setPlayerCount(n);
              reset(n);
            }}
            className={`h-auto rounded px-2 py-1 text-xs ${
              playerCount === n ? "border-[var(--blue)] text-[var(--blue)]" : "border-[var(--line)] text-[var(--text-dim)]"
            }`}
          >
            {n}명
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => reset()}
          className="h-auto rounded px-2 py-1 text-xs text-[var(--text-dim)] hover:bg-white/5"
        >
          다시 시작
        </Button>

        <span className="ml-3 text-[var(--text-dim)]">시점</span>
        {room.players.map((p, i) => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            onClick={() => {
              setViewingPlayerId(p.id);
              setError("");
            }}
            style={{ borderColor: viewingPlayerId === p.id ? SEAT_COLORS[i % SEAT_COLORS.length] : "var(--line)" }}
            className="h-auto rounded bg-black/30 px-2 py-1 text-xs"
          >
            <span style={{ color: SEAT_COLORS[i % SEAT_COLORS.length] }}>{p.name}</span>
            {p.id === currentPlayerId && <span className="ml-1 text-[var(--text-dim)]">턴</span>}
          </Button>
        ))}

        <span className="ml-auto text-xs text-[var(--text-dim)]">
          {viewer.name} 시점 ·{" "}
          {room.phase === "awaiting-play" && `${room.players.find((p) => p.id === currentPlayerId)?.name}님의 턴`}
          {room.phase === "awaiting-answer" && `${room.players.find((p) => p.id === pending?.playerId)?.name}님 퀴즈 도전 중`}
          {room.phase === "finished" && "게임 종료!"}
        </span>
        <ScoreBoard room={room} currentPlayerId={currentPlayerId} />
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 px-4 py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 실제 게임 화면과 동일하게 — 나머지 뷰포트 전체를 캔버스로 채운다 */}
      <div className="relative min-h-0 flex-1">
        <CanvasScale>
          <div className="flex h-full w-full flex-col gap-4 p-10 text-[var(--text)]">
            <GameFlow
              room={room}
              playerId={viewingPlayerId}
              onPlayCard={handlePlayCard}
              onAnswer={handleAnswer}
              onPickOption={handlePickOption}
            />
            {room.phase === "finished" && <FinishedPanel room={room} />}
          </div>
        </CanvasScale>
      </div>
    </main>
  );
}
