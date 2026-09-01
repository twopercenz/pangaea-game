"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { EffectType, PlateId, RoomState, TargetId } from "@/lib/types";
import {
  PLATE_SHAPES,
  PLATE_VIEWBOX,
  PlateShape,
  SUPER_COLOR,
  SUPER_SPLIT,
} from "@/lib/plateShapes";
import { MERGE_DEF, SUPER_DEFS, SUPER_OF_PLATE } from "@/lib/plates";
import { stageOf } from "@/lib/gameLogic";

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
  const [selectedPlate, setSelectedPlate] = useState<TargetId | null>(null);
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
      setError("이동시킬 대상을 먼저 선택하세요.");
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
  // 전체 전진 카드는 대상을 고를 필요가 없으므로 그때만 보드 선택을 잠근다.
  const pickedCard = me?.hand.find((c) => c.cardId === selectedCard) ?? null;
  const needsTarget = !!pickedCard && pickedCard.type !== "allForward1";

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
  selectedPlate: TargetId | null;
  onSelect: (id: TargetId) => void;
  selectable: boolean;
}) {
  const stage = stageOf(room);
  // 합체가 진행될수록 두 초대륙 사이 테티스 해가 닫힌다.
  const mergeFrac = room.merge.progress / MERGE_DEF.trackLength;
  const splitScale = 1 - mergeFrac;
  const splitOf = (id: PlateId): [number, number] => {
    const [sx, sy] = SUPER_SPLIT[SUPER_OF_PLATE[id]];
    return [sx * splitScale, sy * splitScale];
  };

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
        {stage === "assemble"
          ? "1단계 — 조각을 모아 로라시아와 곤드와나를 만드세요"
          : "2단계 — 테티스 해를 닫아 두 초대륙을 합치세요"}
      </p>

      <SuperContinentBadges room={room} />

      {/* 조각 SVG 7종은 모두 같은 viewBox 좌표계라, 한 SVG 안에 그대로 얹으면 판게아가 맞물린다. */}
      <svg
        viewBox={PLATE_VIEWBOX}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 각 조각이 들어갈 자리를 알려주는 고스트 실루엣 (소속 초대륙과 함께 움직인다) */}
        {room.plates.map((plate) => {
          const [sx, sy] = splitOf(plate.id);
          return (
            <g
              key={`ghost-${plate.id}`}
              transform={`translate(${sx} ${sy})`}
              fill="none"
              stroke={SUPER_COLOR[SUPER_OF_PLATE[plate.id]]}
              strokeOpacity="0.18"
              strokeWidth="0.6"
              strokeDasharray="2 2"
              className="transition-transform duration-700"
            >
              {PLATE_SHAPES[plate.id].paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          );
        })}

        {room.plates.map((plate) => {
          const shape = PLATE_SHAPES[plate.id];
          const trackLen = TRACK_LENGTHS[plate.id];
          const isDone = !!plate.completedBy;
          const isSelected = selectedPlate === plate.id;
          // 조각 진행도만큼 표류가 줄어 소속 초대륙 자리에 붙고,
          // 그 초대륙 전체는 합체 진행도만큼 상대 초대륙 쪽으로 다가간다.
          const remaining = isDone ? 0 : 1 - Math.min(1, plate.progress / trackLen);
          const [sx, sy] = splitOf(plate.id);
          const dx = shape.drift[0] * remaining + sx;
          const dy = shape.drift[1] * remaining + sy;
          const owner = room.players.find((p) => p.id === plate.completedBy);
          const clickable = selectable && stage === "assemble" && !isDone;

          return (
            <g
              key={plate.id}
              transform={`translate(${dx} ${dy})`}
              onClick={clickable ? () => onSelect(plate.id) : undefined}
              className={`transition-transform duration-700 ${clickable ? "cursor-pointer" : "cursor-default"}`}
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
              <PlateLabel
                shape={shape}
                title={PLATE_NAME[plate.id]}
                subtitle={isDone ? `${owner?.name ?? ""} 완성` : `${plate.progress}/${trackLen}칸`}
              />
            </g>
          );
        })}
      </svg>

      {stage === "merge" && (
        <MergeControl
          room={room}
          selected={selectedPlate === "pangaea"}
          selectable={selectable}
          onSelect={() => onSelect("pangaea")}
        />
      )}
    </div>
  );
}

/** 조각 위에 얹는 이름 + 진행도. 외곽선을 깔아 어떤 색 위에서도 읽히게 한다. */
function PlateLabel({ shape, title, subtitle }: { shape: PlateShape; title: string; subtitle: string }) {
  const [x, y] = shape.label;
  const common = {
    textAnchor: "middle" as const,
    stroke: "#000000",
    strokeOpacity: 0.5,
    style: { paintOrder: "stroke", pointerEvents: "none" as const },
  };
  return (
    <>
      <text {...common} x={x} y={y} fontSize="7" fontWeight="700" fill="#ffffff" strokeWidth="1.6">
        {title}
      </text>
      <text {...common} x={x} y={y + 8} fontSize="5.5" fill="#ffffff" fillOpacity={0.85} strokeWidth="1.4">
        {subtitle}
      </text>
    </>
  );
}

/** 두 초대륙의 조립 현황 배지 */
function SuperContinentBadges({ room }: { room: RoomState }) {
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
      {SUPER_DEFS.map((def) => {
        const state = room.superContinents.find((s) => s.id === def.id)!;
        const done = def.members.filter((m) => room.plates.find((p) => p.id === m)?.completedBy).length;
        const color = SUPER_COLOR[def.id];
        const owner = room.players.find((p) => p.id === state.completedBy);
        return (
          <div
            key={def.id}
            style={{ borderColor: state.completedBy ? color : "rgba(255,255,255,0.1)", color }}
            className="rounded-lg border bg-black/50 px-2.5 py-1 text-[11px] backdrop-blur-sm"
          >
            <b>{def.nameKo}</b>{" "}
            <span className="text-white/50">
              {state.completedBy ? `완성 · ${owner?.name ?? ""}` : `${done}/${def.members.length} 조각`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 2단계 전용 타깃 — 조각 대신 이 트랙을 겨냥해 테티스 해를 닫는다. */
function MergeControl({
  room,
  selected,
  selectable,
  onSelect,
}: {
  room: RoomState;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const { progress, completedBy } = room.merge;
  const pct = (progress / MERGE_DEF.trackLength) * 100;
  const done = !!completedBy;
  return (
    <button
      disabled={!selectable || done}
      onClick={onSelect}
      style={{ borderColor: selected ? "#ffffff" : done ? "#10b981" : "rgba(255,255,255,0.15)" }}
      className={`absolute bottom-3 left-1/2 z-10 w-[min(20rem,85%)] -translate-x-1/2 rounded-xl border bg-black/70 px-4 py-2.5 text-left backdrop-blur-sm transition-colors ${
        selectable && !done ? "cursor-pointer hover:bg-black/90" : "cursor-default"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">
          {done ? "판게아 완성!" : "테티스 해 닫기"}
        </span>
        <span className="text-[11px] text-white/50">
          {progress}/{MERGE_DEF.trackLength}칸 · {MERGE_DEF.points}점
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#fbbf24] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {selectable && !done && !selected && (
        <p className="mt-1 text-[11px] text-white/40">여기를 눌러 합체 대상으로 지정하세요</p>
      )}
    </button>
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
  selectedPlate: TargetId | null;
  onPlay: () => void;
}) {
  if (!isMyTurn) {
    return <p className="py-4 text-center text-sm text-white/40">다른 플레이어의 턴을 기다리는 중...</p>;
  }
  const card = hand.find((c) => c.cardId === selectedCard);
  const needsTarget = card && card.type !== "allForward1";

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
        disabled={!selectedCard || (!!needsTarget && !selectedPlate)}
        className="rounded-lg border border-white/20 bg-white px-5 py-2 font-semibold text-[#0d1620] disabled:opacity-30"
      >
        {needsTarget && !selectedPlate ? "위 보드에서 대상을 먼저 선택하세요" : "카드 내고 퀴즈 도전!"}
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
