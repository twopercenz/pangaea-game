"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { EffectType, PlateId, RoomState } from "@/lib/types";
import { PLATE_SHAPES, PLATE_VIEWBOX } from "@/lib/plateShapes";

const EFFECT_LABEL: Record<EffectType, { label: string; desc: string }> = {
  forward1: { label: "1칸 전진", desc: "조각 하나를 1칸 이동" },
  forward2: { label: "2칸 전진", desc: "조각 하나를 2칸 이동" },
  allForward1: { label: "전체 1칸 전진", desc: "모든 미완성 조각을 1칸씩 이동" },
};

// 좌석 색상 — 피그마 판게아 보드의 4방향 카드 존 색상(rose/amber/emerald/blue)을 순환 배정
export const SEAT_COLORS = ["#f59e0b", "#f43f5e", "#10b981", "#3b82f6"];

const PLATE_NAME: Record<PlateId, string> = {
  eurasia: "유라시아",
  north_america: "북아메리카",
  africa: "아프리카",
  south_america: "남아메리카",
  india: "인도",
  antarctica_australia: "남극-오스트레일리아",
};

const TRACK_LENGTHS: Record<PlateId, number> = {
  eurasia: 6,
  africa: 5,
  antarctica_australia: 5,
  north_america: 4,
  south_america: 4,
  india: 3,
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
      <main className="flex min-h-screen items-center justify-center bg-[#08080d] text-white/60">
        <p>{error || "불러오는 중..."}</p>
      </main>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const isHost = playerId === room.hostId;
  const currentPlayerId = room.turnOrder[room.currentPlayerIndex];
  const isMyTurn = currentPlayerId === playerId;
  const pending = room.pendingPlay;
  const iAmAnswering = pending?.playerId === playerId;
  const myColor = SEAT_COLORS[room.players.findIndex((p) => p.id === playerId) % SEAT_COLORS.length] ?? SEAT_COLORS[0];

  return (
    <main className="min-h-screen bg-[#08080d] p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">판게아 — 방 {room.code}</h1>
            <p className="text-sm text-white/40">
              {room.phase === "lobby" && "대기 중"}
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

        {!me && room.phase === "lobby" && (
          <div className="max-w-sm space-y-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <p>이 방에 참가하시겠어요?</p>
            <input
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              placeholder="닉네임"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="w-full rounded-lg border border-[#10b981] bg-[#10b981]/10 py-2 font-semibold text-[#10b981] hover:bg-[#10b981]/20"
            >
              참가하기
            </button>
          </div>
        )}

        {room.phase === "lobby" && me && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-white/70">
              참가자: {room.players.map((p) => p.name).join(", ")} ({room.players.length}/4)
            </p>
            <p className="text-sm text-white/40">
              친구에게 방 코드 <b className="text-white">{room.code}</b>를 공유하세요. (최소 2명)
            </p>
            {isHost ? (
              <button
                onClick={handleStart}
                disabled={room.players.length < 2}
                className="rounded-lg border border-[#f59e0b] bg-[#f59e0b]/10 px-5 py-2 font-semibold text-[#f59e0b] disabled:opacity-30"
              >
                게임 시작
              </button>
            ) : (
              <p className="text-sm text-white/40">방장이 시작하기를 기다리는 중...</p>
            )}
          </div>
        )}

        {room.phase !== "lobby" && (
          <>
            <PangaeaBoard
              room={room}
              selectedPlate={selectedPlate}
              onSelect={setSelectedPlate}
              selectable={isMyTurn && room.phase === "awaiting-play" && !!selectedCard && selectedCard !== "allForward1"}
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
                seatColor={myColor}
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

export function ScoreBoard({ room, currentPlayerId }: { room: RoomState; currentPlayerId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {room.players.map((p, i) => {
        const color = SEAT_COLORS[i % SEAT_COLORS.length];
        const isTurn = p.id === currentPlayerId;
        return (
          <div
            key={p.id}
            style={{ borderColor: isTurn ? color : "rgba(255,255,255,0.1)" }}
            className={`rounded-lg border bg-[#1a1a1a] px-3 py-1.5 text-sm ${isTurn ? "" : ""}`}
          >
            <span className="font-medium" style={{ color: isTurn ? color : "white" }}>
              {p.name}
            </span>{" "}
            <span className="text-white/40">{p.score}점</span>
          </div>
        );
      })}
    </div>
  );
}

export function PangaeaBoard({
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
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12]">
      {/* map-grid-layer: 크로스헤어 가이드 + 방사형 글로우 (피그마 배경 참고) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[70%] rounded-full bg-[#3b82f6]/[0.04] blur-3xl" />
        <div className="absolute size-[100%] rounded-full bg-[#f59e0b]/[0.03] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/[0.06]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/[0.06]" />

      <p className="absolute left-3 top-3 z-10 text-xs text-white/30">
        조각을 밀어 넣어 판게아를 완성하세요
      </p>

      {/* 조각 SVG 7종은 모두 같은 viewBox 좌표계라, 한 SVG 안에 그대로 얹으면 판게아가 맞물린다. */}
      <svg
        viewBox={PLATE_VIEWBOX}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 완성 위치를 알려주는 고스트 실루엣 */}
        <g fill="none" stroke="#ffffff" strokeOpacity="0.13" strokeWidth="0.6" strokeDasharray="2 2">
          {room.plates.map((plate) =>
            PLATE_SHAPES[plate.id].paths.map((d, i) => <path key={`${plate.id}-${i}`} d={d} />)
          )}
        </g>

        {room.plates.map((plate) => {
          const shape = PLATE_SHAPES[plate.id];
          const trackLen = TRACK_LENGTHS[plate.id];
          const isDone = !!plate.completedBy;
          const isSelected = selectedPlate === plate.id;
          // 진행할수록 표류 거리가 줄어들어 제자리(판게아)로 붙는다.
          const remaining = isDone ? 0 : 1 - Math.min(1, plate.progress / trackLen);
          const [dx, dy] = shape.drift;
          const owner = room.players.find((p) => p.id === plate.completedBy);

          return (
            <g
              key={plate.id}
              transform={`translate(${dx * remaining} ${dy * remaining})`}
              onClick={selectable && !isDone ? () => onSelect(plate.id) : undefined}
              className={`transition-transform duration-500 ${
                selectable && !isDone ? "cursor-pointer" : "cursor-default"
              }`}
              style={{
                filter: isSelected
                  ? "drop-shadow(0 0 3px #ffffff)"
                  : isDone
                    ? `drop-shadow(0 0 3px ${shape.color})`
                    : "none",
              }}
            >
              {shape.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={shape.color}
                  fillOpacity={isDone ? 1 : 0.55}
                  stroke={isSelected ? "#ffffff" : "#000000"}
                  strokeOpacity={isSelected ? 0.9 : 0.35}
                  strokeWidth={isSelected ? 1.2 : 0.5}
                  className="transition-all"
                />
              ))}
              <text
                x={shape.label[0]}
                y={shape.label[1]}
                textAnchor="middle"
                fontSize="7"
                fontWeight="700"
                fill="#ffffff"
                style={{ paintOrder: "stroke", pointerEvents: "none" }}
                stroke="#000000"
                strokeOpacity={0.5}
                strokeWidth="1.6"
              >
                {PLATE_NAME[plate.id]}
              </text>
              <text
                x={shape.label[0]}
                y={shape.label[1] + 8}
                textAnchor="middle"
                fontSize="5.5"
                fill="#ffffff"
                fillOpacity={0.85}
                style={{ paintOrder: "stroke", pointerEvents: "none" }}
                stroke="#000000"
                strokeOpacity={0.5}
                strokeWidth="1.4"
              >
                {isDone ? `${owner?.name ?? ""} 완성` : `${plate.progress}/${trackLen}칸`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HandPanel({
  hand,
  isMyTurn,
  selectedCard,
  seatColor,
  onSelectCard,
  selectedPlate,
  onPlay,
}: {
  hand: RoomState["players"][number]["hand"];
  isMyTurn: boolean;
  selectedCard: string | null;
  seatColor: string;
  onSelectCard: (id: string) => void;
  selectedPlate: PlateId | null;
  onPlay: () => void;
}) {
  if (!isMyTurn) {
    return <p className="py-4 text-center text-sm text-white/40">다른 플레이어의 턴을 기다리는 중...</p>;
  }
  const card = hand.find((c) => c.cardId === selectedCard);
  const needsPlate = card && card.type !== "allForward1";

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#0b0b12] p-4">
      <p className="text-sm text-white/50">내 턴 — 카드를 선택해 내세요</p>
      {/* game-card-back 스타일: 어두운 카드에 좌석 색 테두리 */}
      <div className="flex flex-wrap gap-3">
        {hand.map((c) => {
          const meta = EFFECT_LABEL[c.type];
          const isSelected = c.cardId === selectedCard;
          return (
            <button
              key={c.cardId}
              onClick={() => onSelectCard(c.cardId)}
              style={{ borderColor: isSelected ? "#ffffff" : seatColor }}
              className={`w-36 rounded-lg border-2 bg-[#1a1a1a] p-4 text-left shadow-[0px_6px_16px_-6px_rgba(0,0,0,0.4)] transition ${
                isSelected ? "scale-105" : "opacity-90 hover:opacity-100"
              }`}
            >
              <div className="font-bold text-white">{meta.label}</div>
              <div className="mt-1 text-xs text-white/50">{meta.desc}</div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onPlay}
        disabled={!selectedCard || (!!needsPlate && !selectedPlate)}
        className="rounded-lg border border-white/20 bg-white px-5 py-2 font-semibold text-[#0d1620] disabled:opacity-30"
      >
        {needsPlate ? (selectedPlate ? "카드 내고 퀴즈 도전!" : "위 보드에서 조각을 먼저 선택하세요") : "카드 내고 퀴즈 도전!"}
      </button>
    </div>
  );
}

export function QuizPanel({
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
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{pending.quiz.category}</p>
      <h2 className="text-lg font-semibold text-white">{pending.quiz.question}</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {pending.quiz.options.map((opt, idx) => (
          <button
            key={idx}
            disabled={!canAnswer || answering}
            onClick={() => onAnswer(idx)}
            className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-left text-white transition hover:border-[#f59e0b]/60 hover:bg-black/50 disabled:opacity-50 disabled:hover:border-white/10"
          >
            {idx + 1}. {opt}
          </button>
        ))}
      </div>
      {!canAnswer && <p className="text-sm text-white/40">{answererName}님이 답변 중입니다...</p>}
    </div>
  );
}

export function FinishedPanel({ room }: { room: RoomState }) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-3 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 p-6">
      <h2 className="text-xl font-bold text-white">🎉 판게아 완성! 최종 결과</h2>
      <ol className="space-y-1">
        {ranked.map((p, i) => (
          <li key={p.id} className="flex justify-between text-lg text-white">
            <span>{i + 1}위 {p.name}</span>
            <span className="font-bold">{p.score}점</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
