"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { RoomState, TargetId } from "@/lib/types";
import { ScoreBoard, FinishedPanel } from "@/components/game/board";
import { GameFlow } from "@/components/game/flow";
import { CanvasScale } from "@/components/game/CanvasScale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [error, setError] = useState("");
  const [nameInput, setNameInput] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`pangaea-player-${code}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount, not a render loop
    if (stored) setPlayerId(stored);
  }, [code]);

  const fetchRoom = useCallback(async () => {
    try {
      const url = `/api/rooms/${code}${playerId ? `?playerId=${playerId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setError("");
      } else {
        setError(data.error || "오류가 발생했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    }
  }, [code, playerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + poll loop for realtime sync
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchRoom]);

  async function handleJoin() {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "입장 실패");
      return;
    }
    localStorage.setItem(`pangaea-player-${code}`, data.playerId);
    setPlayerId(data.playerId);
    setRoom(data.room);
  }

  async function handleStart() {
    const res = await fetch(`/api/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "시작 실패");
    else setRoom(data.room);
  }

  async function handlePlayCard(cardId: string, targetPlateId: TargetId | null): Promise<RoomState> {
    const res = await fetch(`/api/rooms/${code}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, cardId, targetPlateId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "카드를 낼 수 없습니다.");
      throw new Error(data.error);
    }
    setRoom(data.room);
    return data.room as RoomState;
  }

  async function handleAnswer(idx: number): Promise<RoomState> {
    const res = await fetch(`/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, answerIndex: idx }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "답변 실패");
      throw new Error(data.error);
    }
    setRoom(data.room);
    return data.room as RoomState;
  }

  function handlePickOption(idx: number | null) {
    // 실시간 미리보기 용도라 실패해도 조용히 무시 — 다음 poll에서 다시 맞춰진다.
    fetch(`/api/rooms/${code}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, optionIndex: idx }),
    }).catch(() => {});
  }

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-dim)]">
        <p>{error || "불러오는 중..."}</p>
      </main>
    );
  }

  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];

  // 로비(인원 대기)는 UI_SPEC 범위 밖이라 기존 방식대로 스크롤 가능한 일반 페이지로 둔다.
  if (room.phase === "lobby") {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text)] md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="flex-row flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">판게아 — 방 {room.code}</h1>
              <p className="text-sm text-[var(--text-dim)]">대기 중</p>
            </div>
            <ScoreBoard room={room} currentPlayerId={currentPlayerId} />
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!room.players.find((p) => p.id === playerId) && (
            <Card className="max-w-sm p-6">
              <CardContent className="space-y-3 p-0">
                <p>이 방에 참가하시겠어요?</p>
                <Input
                  className="h-auto rounded-lg px-3 py-2 text-sm"
                  placeholder="닉네임"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
                <Button
                  onClick={handleJoin}
                  className="h-auto w-full rounded-lg border border-[var(--green-2)] bg-[var(--green-2)]/10 py-2 font-semibold text-[var(--green-2)] hover:bg-[var(--green-2)]/20"
                >
                  참가하기
                </Button>
              </CardContent>
            </Card>
          )}

          {room.players.find((p) => p.id === playerId) && (
            <Card className="p-6">
              <CardContent className="space-y-3 p-0">
                <p className="text-[var(--text-dim)]">
                  참가자: {room.players.map((p) => p.name).join(", ")} ({room.players.length}/4)
                </p>
                <p className="text-sm text-[var(--text-dim)]">
                  친구에게 방 코드 <b className="text-[var(--text)]">{room.code}</b>를 공유하세요. (최소 2명)
                </p>
                {playerId === room.hostId ? (
                  <Button
                    onClick={handleStart}
                    disabled={room.players.length < 2}
                    className="h-auto rounded-lg border border-[var(--blue)] bg-[var(--blue)]/10 px-5 py-2 font-semibold text-[var(--blue)] hover:bg-[var(--blue)]/20 disabled:opacity-30"
                  >
                    게임 시작
                  </Button>
                ) : (
                  <p className="text-sm text-[var(--text-dim)]">방장이 시작하기를 기다리는 중...</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }

  // 게임 진행 중: UI_SPEC 고정 캔버스(1920×1080) — 리플로우 없이 전체를 뷰포트에 맞춰 스케일링만 한다.
  if (!playerId) return null;
  return (
    <div className="relative h-screen w-screen">
    <CanvasScale>
      <div className="flex h-full w-full flex-col gap-4 p-10 text-[var(--text)]">
        <Card className="flex-row items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">판게아 — 방 {room.code}</h1>
            <p className="text-sm text-[var(--text-dim)]">
              {room.phase === "awaiting-play" && `${room.players.find((p) => p.id === currentPlayerId)?.name}님의 턴`}
              {room.phase === "awaiting-answer" &&
                `${room.players.find((p) => p.id === room.pendingPlay?.playerId)?.name}님 퀴즈 도전 중`}
              {room.phase === "finished" && "게임 종료!"}
            </p>
          </div>
          <ScoreBoard room={room} currentPlayerId={currentPlayerId} />
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 보드/손패 크기가 캔버스 예산을 넘어도(내용이 잘려 안 보이는 대신) 스크롤로 접근 가능하게 안전장치 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <GameFlow
            room={room}
            playerId={playerId}
            onPlayCard={handlePlayCard}
            onAnswer={handleAnswer}
            onPickOption={handlePickOption}
          />
        </div>
        {room.phase === "finished" && <FinishedPanel room={room} />}
      </div>
    </CanvasScale>
    </div>
  );
}
