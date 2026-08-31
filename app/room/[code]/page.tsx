"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { EffectType, PlateId, RoomState } from "@/lib/types";

const EFFECT_LABEL: Record<EffectType, { label: string; desc: string; color: string }> = {
  forward1: { label: "1칸 전진", desc: "조각 하나를 1칸 이동", color: "bg-sky-500" },
  forward2: { label: "2칸 전진", desc: "조각 하나를 2칸 이동", color: "bg-violet-500" },
  allForward1: { label: "전체 1칸 전진", desc: "모든 미완성 조각을 1칸씩 이동", color: "bg-amber-500" },
};

// 판게아 실루엣 근사 배치 (퍼센트 좌표, 지리적으로 정밀하진 않지만 학습용으로 인접 관계를 반영)
const PLATE_LAYOUT: Record<PlateId, { left: string; top: string; w: string; h: string; color: string }> = {
  eurasia: { left: "50%", top: "8%", w: "34%", h: "26%", color: "#5b8c5a" },
  north_america: { left: "24%", top: "12%", w: "24%", h: "24%", color: "#4f7cac" },
  africa: { left: "40%", top: "38%", w: "24%", h: "28%", color: "#c97b3d" },
  south_america: { left: "22%", top: "48%", w: "18%", h: "26%", color: "#a85751" },
  india: { left: "58%", top: "50%", w: "12%", h: "16%", color: "#8a5ea3" },
  antarctica_australia: { left: "38%", top: "68%", w: "30%", h: "18%", color: "#4a8f8b" },
};

const PLATE_NAME: Record<PlateId, string> = {
  eurasia: "유라시아",
  north_america: "북아메리카",
  africa: "아프리카",
  south_america: "남아메리카",
  india: "인도",
  antarctica_australia: "남극-오스트레일리아",
};

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<PlateId | null>(null);
  const [answering, setAnswering] = useState(false);
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

  async function handlePlayCard() {
    if (!selectedCard) return;
    const card = room?.players.find((p) => p.id === playerId)?.hand.find((c) => c.cardId === selectedCard);
    if (!card) return;
    if (card.type !== "allForward1" && !selectedPlate) {
      setError("이동시킬 조각을 먼저 선택하세요.");
      return;
    }
    const res = await fetch(`/api/rooms/${code}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, cardId: selectedCard, targetPlateId: selectedPlate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "카드를 낼 수 없습니다.");
      return;
    }
    setSelectedCard(null);
    setSelectedPlate(null);
    setRoom(data.room);
  }

  async function handleAnswer(idx: number) {
    setAnswering(true);
    const res = await fetch(`/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, answerIndex: idx }),
    });
    const data = await res.json();
    setAnswering(false);
    if (!res.ok) {
      setError(data.error || "답변 실패");
      return;
    }
    setRoom(data.room);
  }

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d1620] text-white">
        <p className="text-white/60">{error || "불러오는 중..."}</p>
      </main>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const isHost = playerId === room.hostId;
  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];
  const isMyTurn = currentPlayerId === playerId;
  const pending = room.pendingPlay;
  const iAmAnswering = pending?.playerId === playerId;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a2a3a] to-[#0d1620] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">🌍 판게아 — 방 {room.code}</h1>
            <p className="text-white/50 text-sm">
              {room.phase === "lobby" && "대기 중"}
              {room.phase === "awaiting-play" && `${room.players.find((p) => p.id === currentPlayerId)?.name}님의 턴`}
              {room.phase === "awaiting-answer" && `${room.players.find((p) => p.id === pending?.playerId)?.name}님 퀴즈 도전 중`}
              {room.phase === "finished" && "게임 종료!"}
            </p>
          </div>
          <ScoreBoard room={room} currentPlayerId={currentPlayerId} />
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {!me && room.phase === "lobby" && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3 max-w-sm">
            <p>이 방에 참가하시겠어요?</p>
            <input
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none"
              placeholder="닉네임"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button onClick={handleJoin} className="w-full rounded-lg bg-emerald-500 py-2 font-semibold">
              참가하기
            </button>
          </div>
        )}

        {room.phase === "lobby" && me && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
            <p className="text-white/70">
              참가자: {room.players.map((p) => p.name).join(", ")} ({room.players.length}/4)
            </p>
            <p className="text-white/40 text-sm">
              친구에게 방 코드 <b className="text-white">{room.code}</b>를 공유하세요. (최소 2명)
            </p>
            {isHost ? (
              <button
                onClick={handleStart}
                disabled={room.players.length < 2}
                className="rounded-lg bg-emerald-500 disabled:opacity-40 px-5 py-2 font-semibold"
              >
                게임 시작
              </button>
            ) : (
              <p className="text-white/50 text-sm">방장이 시작하기를 기다리는 중...</p>
            )}
          </div>
        )}

        {room.phase !== "lobby" && (
          <>
            <PangaeaBoard room={room} selectedPlate={selectedPlate} onSelect={setSelectedPlate} selectable={isMyTurn && room.phase === "awaiting-play" && !!selectedCard && selectedCard !== "allForward1"} />

            {room.lastAnswer && (
              <div
                className={`rounded-xl px-4 py-3 text-sm border ${
                  room.lastAnswer.correct
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                    : "bg-red-500/15 border-red-500/40 text-red-200"
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
                answering={answering}
                answererName={room.players.find((p) => p.id === pending.playerId)?.name ?? ""}
                onAnswer={handleAnswer}
              />
            )}

            {me && room.phase === "awaiting-play" && (
              <HandPanel
                hand={me.hand}
                isMyTurn={isMyTurn}
                selectedCard={selectedCard}
                onSelectCard={(id) => {
                  setSelectedCard(id === selectedCard ? null : id);
                  setSelectedPlate(null);
                }}
                selectedPlate={selectedPlate}
                onPlay={handlePlayCard}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ScoreBoard({ room, currentPlayerId }: { room: RoomState; currentPlayerId: string }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {room.players.map((p) => (
        <div
          key={p.id}
          className={`rounded-lg px-3 py-1.5 text-sm border ${
            p.id === currentPlayerId ? "bg-emerald-500/20 border-emerald-400" : "bg-white/5 border-white/10"
          }`}
        >
          <span className="font-medium">{p.name}</span>{" "}
          <span className="text-white/50">{p.score}점</span>
        </div>
      ))}
    </div>
  );
}

function PangaeaBoard({
  room,
  selectedPlate,
  onSelect,
  selectable,
}: {
  room: RoomState;
  selectedPlate: PlateId | null;
  onSelect: (id: PlateId) => void;
  selectable: boolean;
}) {
  return (
    <div className="relative w-full aspect-[4/3] bg-[#0f2436] rounded-2xl border border-white/10 overflow-hidden">
      <p className="absolute top-3 left-3 text-white/30 text-xs z-10">
        조각을 밀어 넣어 판게아를 완성하세요
      </p>
      {room.plates.map((plate) => {
        const layout = PLATE_LAYOUT[plate.id];
        const total = plate.progress;
        const pct = (progressLen: number, trackLen: number) => Math.min(100, (progressLen / trackLen) * 100);
        const trackLen = TRACK_LENGTHS[plate.id];
        const isDone = !!plate.completedBy;
        const isSelected = selectedPlate === plate.id;
        return (
          <button
            key={plate.id}
            disabled={!selectable || isDone}
            onClick={() => onSelect(plate.id)}
            style={{
              left: layout.left,
              top: layout.top,
              width: layout.w,
              height: layout.h,
              backgroundColor: isDone ? layout.color : `${layout.color}33`,
              borderColor: isSelected ? "#fff" : isDone ? layout.color : "#ffffff55",
            }}
            className={`absolute rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
              selectable && !isDone ? "cursor-pointer hover:scale-105" : "cursor-default"
            } ${isDone ? "shadow-lg" : "border-dashed"}`}
          >
            <span className="text-xs md:text-sm font-semibold drop-shadow">{PLATE_NAME[plate.id]}</span>
            {!isDone && (
              <span className="text-[10px] text-white/70">
                {total}/{trackLen}칸
              </span>
            )}
            {isDone && (
              <span className="text-[10px] text-white/90">
                {room.players.find((p) => p.id === plate.completedBy)?.name} 완성
              </span>
            )}
            {!isDone && (
              <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80"
                  style={{ width: `${pct(total, trackLen)}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TRACK_LENGTHS: Record<PlateId, number> = {
  eurasia: 6,
  africa: 5,
  antarctica_australia: 5,
  north_america: 4,
  south_america: 4,
  india: 3,
};

function HandPanel({
  hand,
  isMyTurn,
  selectedCard,
  onSelectCard,
  selectedPlate,
  onPlay,
}: {
  hand: RoomState["players"][number]["hand"];
  isMyTurn: boolean;
  selectedCard: string | null;
  onSelectCard: (id: string) => void;
  selectedPlate: PlateId | null;
  onPlay: () => void;
}) {
  if (!isMyTurn) {
    return <p className="text-white/40 text-sm text-center py-4">다른 플레이어의 턴을 기다리는 중...</p>;
  }
  const card = hand.find((c) => c.cardId === selectedCard);
  const needsPlate = card && card.type !== "allForward1";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <p className="text-sm text-white/60">내 턴 — 카드를 선택해 내세요</p>
      <div className="flex gap-3 flex-wrap">
        {hand.map((c) => {
          const meta = EFFECT_LABEL[c.type];
          const isSelected = c.cardId === selectedCard;
          return (
            <button
              key={c.cardId}
              onClick={() => onSelectCard(c.cardId)}
              className={`rounded-xl px-4 py-4 w-36 text-left border-2 transition ${meta.color} ${
                isSelected ? "border-white scale-105" : "border-transparent opacity-90 hover:opacity-100"
              }`}
            >
              <div className="font-bold">{meta.label}</div>
              <div className="text-xs text-white/80 mt-1">{meta.desc}</div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onPlay}
        disabled={!selectedCard || (!!needsPlate && !selectedPlate)}
        className="rounded-lg bg-white text-[#0d1620] disabled:opacity-30 px-5 py-2 font-semibold"
      >
        {needsPlate ? (selectedPlate ? "카드 내고 퀴즈 도전!" : "위 보드에서 조각을 먼저 선택하세요") : "카드 내고 퀴즈 도전!"}
      </button>
    </div>
  );
}

function QuizPanel({
  pending,
  canAnswer,
  answering,
  answererName,
  onAnswer,
}: {
  pending: NonNullable<RoomState["pendingPlay"]>;
  canAnswer: boolean;
  answering: boolean;
  answererName: string;
  onAnswer: (idx: number) => void;
}) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-5 space-y-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{pending.quiz.category}</p>
      <h2 className="text-lg font-semibold">{pending.quiz.question}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {pending.quiz.options.map((opt, idx) => (
          <button
            key={idx}
            disabled={!canAnswer || answering}
            onClick={() => onAnswer(idx)}
            className="text-left rounded-lg bg-white/10 hover:bg-white/20 disabled:hover:bg-white/10 disabled:opacity-60 border border-white/10 px-4 py-3 transition"
          >
            {idx + 1}. {opt}
          </button>
        ))}
      </div>
      {!canAnswer && (
        <p className="text-white/40 text-sm">{answererName}님이 답변 중입니다...</p>
      )}
    </div>
  );
}

function FinishedPanel({ room }: { room: RoomState }) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 space-y-3">
      <h2 className="text-xl font-bold">🎉 판게아 완성! 최종 결과</h2>
      <ol className="space-y-1">
        {ranked.map((p, i) => (
          <li key={p.id} className="flex justify-between text-lg">
            <span>
              {i + 1}위 {p.name}
            </span>
            <span className="font-bold">{p.score}점</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
