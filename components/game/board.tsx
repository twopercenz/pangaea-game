import { memo, useMemo } from "react";
import { ClientRoomState, PlateId, TargetId } from "@/lib/types";
import {
  FILLER_COLOR,
  LANDMASS_PATH,
  PLATE_SHAPES,
  PLATE_VIEWBOX,
  PlateShape,
  SHELF_PATHS,
  SUPER_COLOR,
  SUPER_CUT,
  SUPER_SPLIT,
} from "@/lib/plateShapes";
import { MERGE_DEF, PLATE_DEFS, SUPER_DEFS, SUPER_OF_PLATE } from "@/lib/plates";
import { stageOf } from "@/lib/stage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 좌석 색상 — 4방향 손패 구분에 쓰는 순환 팔레트 (테마 톤에 맞춘 액센트들)
export const SEAT_COLORS = ["#2589BD", "#c2410c", "#28502E", "#47682C"];

export const PLATE_NAME: Record<PlateId, string> = {
  eurasia: "유라시아",
  north_america: "북아메리카",
  africa: "아프리카",
  south_america: "남아메리카",
  india: "인도",
  antarctica_australia: "남극-오스트레일리아",
};

// lib/plates.ts의 PLATE_DEFS가 트랙 길이의 원본이다 — 여기서 다시 값을 베끼면
// 나중에 한쪽만 바뀌었을 때 진행 칸수 표시가 실제 게임 로직과 어긋나므로 파생시켜 쓴다.
export const TRACK_LENGTHS: Record<PlateId, number> = Object.fromEntries(
  PLATE_DEFS.map((p) => [p.id, p.trackLength])
) as Record<PlateId, number>;

// 초대륙 클립 경로는 고정 도형이라 모듈 로드 시 한 번만 만들어 재사용한다.
const SUPER_CLIP_DEFS = (
  <defs>
    {SUPER_DEFS.map((def) => (
      <clipPath key={def.id} id={`cut-${def.id}`} clipPathUnits="userSpaceOnUse">
        <polygon points={SUPER_CUT[def.id]} />
      </clipPath>
    ))}
  </defs>
);

export const ScoreBoard = memo(function ScoreBoard({ room, currentPlayerId }: { room: ClientRoomState; currentPlayerId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {room.players.map((p, i) => {
        const color = SEAT_COLORS[i % SEAT_COLORS.length];
        const isTurn = p.id === currentPlayerId;
        return (
          <Badge
            key={p.id}
            variant="outline"
            style={{ borderColor: isTurn ? color : "rgba(213,223,229,0.15)" }}
            className="h-auto rounded-lg bg-[var(--panel)] px-3 py-1.5 text-sm"
          >
            <span className="font-medium" style={{ color: isTurn ? color : "var(--text)" }}>
              {p.name}
            </span>{" "}
            <span className="text-muted-foreground">{p.score}점</span>
          </Badge>
        );
      })}
    </div>
  );
});

/**
 * 판 전체를 그리는 SVG — 조각/고스트/육괴까지 노드 수가 많아 이 앱에서 가장 비싼 렌더다.
 * props가 그대로면(폴링이 "변경 없음"을 받은 경우) 통째로 건너뛰도록 memo로 감싼다.
 */
export const PangaeaBoard = memo(function PangaeaBoard({
  room,
  selectedPlate,
  onSelect,
  selectable,
}: {
  room: ClientRoomState;
  selectedPlate: TargetId | null;
  onSelect: (id: TargetId) => void;
  selectable: boolean;
}) {
  const stage = stageOf(room);
  // 조각마다 players.find(...)를 다시 도는 대신 한 번만 사전을 만든다.
  const playerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of room.players) m.set(p.id, p.name);
    return m;
  }, [room.players]);
  // 합체가 진행될수록 두 초대륙 사이 테티스 해가 닫힌다.
  const mergeFrac = room.merge.progress / MERGE_DEF.trackLength;
  const splitScale = 1 - mergeFrac;
  const splitOf = (id: PlateId): [number, number] => {
    const [sx, sy] = SUPER_SPLIT[SUPER_OF_PLATE[id]];
    return [sx * splitScale, sy * splitScale];
  };
  /** 조각 진행도만큼 표류가 줄어 제자리에 붙고, 소속 초대륙 전체는 합체 진행도만큼 다가온다. */
  const placementOf = (plate: ClientRoomState["plates"][number]) => {
    const isDone = !!plate.completedBy;
    const remaining = isDone ? 0 : 1 - Math.min(1, plate.progress / TRACK_LENGTHS[plate.id]);
    const [sx, sy] = splitOf(plate.id);
    const drift = PLATE_SHAPES[plate.id].drift;
    return { isDone, transform: `translate(${drift[0] * remaining + sx} ${drift[1] * remaining + sy})` };
  };

  return (
    // 고정 캔버스(1920x1080) 안에 항상 리플로우 없이 들어가야 하므로 aspect-ratio가 아닌
    // 고정 px 크기를 쓴다 (322:416 비율 유지).
    <div className="relative mx-auto h-[800px] w-[1200px] shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--board-bg)]">
      {/* map-grid-layer: 크로스헤어 가이드 + 방사형 글로우.
          내용이 고정된 장식이라 별도 합성 레이어로 올려둔다 — 조각이 700ms 동안 움직일 때
          이 큰 blur를 매 프레임 다시 그리지 않게 된다 (보이는 결과는 동일). */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="size-[70%] rounded-full bg-[var(--blue)]/[0.06] blur-3xl" />
        <div className="absolute size-[100%] rounded-full bg-[var(--green-2)]/[0.05] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-[var(--line)]/60" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-[var(--line)]/60" />

      <p className="absolute left-3 top-3 z-10 text-lg text-[var(--text-dim)]">
        {stage === "assemble"
          ? "1단계 — 조각을 모아 로라시아와 곤드와나를 만드세요"
          : "2단계 — 테티스 해를 닫아 두 초대륙을 합치세요"}
      </p>

      <SuperContinentBadges room={room} />

      {/* 조각 SVG 7종은 모두 같은 viewBox 좌표계라, 한 SVG 안에 그대로 얹으면 판게아가 맞물린다. */}
      <svg viewBox={PLATE_VIEWBOX} className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet">
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

        {/* 조각이 다 붙은 초대륙은 원본 지도의 육괴로 조각 사이 틈을 메운다. */}
        {SUPER_CLIP_DEFS}
        {SUPER_DEFS.map((def) => {
          const assembled = room.superContinents.find((s) => s.id === def.id)?.completedBy;
          if (!assembled) return null;
          const [sx, sy] = SUPER_SPLIT[def.id];
          return (
            <g
              key={`landfill-${def.id}`}
              transform={`translate(${sx * splitScale} ${sy * splitScale})`}
              className="transition-transform duration-700"
            >
              <g clipPath={`url(#cut-${def.id})`}>
                <path d={LANDMASS_PATH} fill={FILLER_COLOR} />
                {SHELF_PATHS.map((d, i) => (
                  <path key={i} d={d} fill={FILLER_COLOR} fillOpacity={0.55} />
                ))}
              </g>
            </g>
          );
        })}

        {/* 조각 본체와 라벨 — 육괴 바탕 위에 얹는다 */}
        {room.plates.map((plate) => {
          const shape = PLATE_SHAPES[plate.id];
          const trackLen = TRACK_LENGTHS[plate.id];
          const { isDone, transform } = placementOf(plate);
          const isSelected = selectedPlate === plate.id;
          const ownerName = plate.completedBy ? playerNameById.get(plate.completedBy) : undefined;
          const clickable = selectable && stage === "assemble" && !isDone;

          return (
            <g
              key={plate.id}
              transform={transform}
              onClick={clickable ? () => onSelect(plate.id) : undefined}
              className={`transition-transform duration-700 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              style={{
                filter: isSelected
                  ? "drop-shadow(0 0 3px #ffffff)"
                  : isDone
                    ? `drop-shadow(0 0 3px ${shape.color})`
                    : "none",
                opacity: selectable && stage === "assemble" && !isDone ? 1 : selectable ? 0.35 : 1,
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
                subtitle={isDone ? `${ownerName ?? ""} 완성` : `${plate.progress}/${trackLen}칸`}
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
});

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
function SuperContinentBadges({ room }: { room: ClientRoomState }) {
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-3">
      {SUPER_DEFS.map((def) => {
        const state = room.superContinents.find((s) => s.id === def.id)!;
        const done = def.members.filter((m) => room.plates.find((p) => p.id === m)?.completedBy).length;
        const color = SUPER_COLOR[def.id];
        const owner = room.players.find((p) => p.id === state.completedBy);
        return (
          <Badge
            key={def.id}
            variant="outline"
            style={{ borderColor: state.completedBy ? color : "rgba(213,223,229,0.15)", color }}
            className="h-auto rounded-xl border-2 bg-black/50 px-5 py-3 text-lg backdrop-blur-sm"
          >
            <b>{def.nameKo}</b>{" "}
            <span className="text-[var(--text-dim)]">
              {state.completedBy ? `완성 · ${owner?.name ?? ""}` : `${done}/${def.members.length} 조각`}
            </span>
          </Badge>
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
  room: ClientRoomState;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const { progress, completedBy } = room.merge;
  const pct = (progress / MERGE_DEF.trackLength) * 100;
  const done = !!completedBy;
  return (
    <Button
      variant="ghost"
      disabled={!selectable || done}
      onClick={onSelect}
      style={{ borderColor: selected ? "#ffffff" : done ? "#28502E" : "rgba(213,223,229,0.2)" }}
      className={`absolute bottom-3 left-1/2 z-10 h-auto w-[min(20rem,85%)] -translate-x-1/2 flex-col items-stretch gap-0 whitespace-normal rounded-xl border bg-black/70 px-4 py-2.5 text-left backdrop-blur-sm transition-colors hover:bg-black/90 disabled:opacity-100 ${
        selectable && !done ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">{done ? "판게아 완성!" : "테티스 해 닫기"}</span>
        <span className="text-[11px] text-[var(--text-dim)]">
          {progress}/{MERGE_DEF.trackLength}칸 · {MERGE_DEF.points}점
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--blue)] to-[var(--green-2)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {selectable && !done && !selected && (
        <p className="mt-1 text-[11px] text-[var(--text-dim)]">여기를 눌러 합체 대상으로 지정하세요</p>
      )}
    </Button>
  );
}

export function FinishedPanel({ room }: { room: ClientRoomState }) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <Card className="border-[var(--green-2)]/40 bg-[var(--green-2)]/10">
      <CardHeader>
        <CardTitle className="text-xl font-bold">🎉 판게아 완성! 최종 결과</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
