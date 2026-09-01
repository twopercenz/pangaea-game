"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function createRoom() {
    setLoading("create");
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "방 생성 실패");
      localStorage.setItem(`pangaea-player-${data.room.code}`, data.playerId);
      router.push(`/room/${data.room.code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("방 코드를 입력해주세요.");
      return;
    }
    setLoading("join");
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "입장 실패");
      localStorage.setItem(`pangaea-player-${code}`, data.playerId);
      router.push(`/room/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080d] flex items-center justify-center p-6">
      {/* radial glow + crosshair grid, matching board aesthetic */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[600px] rounded-full bg-[#f59e0b]/5 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/5" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/5" />

      <div className="relative w-full max-w-sm space-y-5 rounded-xl border border-[#f59e0b]/40 bg-[#1a1a1a] p-8 shadow-[0px_6px_24px_-6px_rgba(0,0,0,0.6)]">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">판게아</h1>
          <p className="text-xs text-white/40">
            퀴즈를 맞혀 조각을 모아 로라시아와 곤드와나를 만들고, 두 초대륙을 충돌시켜 판게아를 완성하세요.
          </p>
        </div>

        <input
          className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#f59e0b]"
          placeholder="닉네임"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={createRoom}
          disabled={loading !== null}
          className="w-full rounded-lg border border-[#f59e0b] bg-[#f59e0b]/10 py-3 text-sm font-semibold text-[#f59e0b] transition hover:bg-[#f59e0b]/20 disabled:opacity-40"
        >
          {loading === "create" ? "생성 중..." : "새 방 만들기"}
        </button>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/30">
          <div className="h-px flex-1 bg-white/10" />
          또는
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center text-sm uppercase tracking-widest text-white outline-none focus:border-[#10b981]"
            placeholder="방 코드"
            value={joinCode}
            maxLength={4}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={joinRoom}
            disabled={loading !== null}
            className="rounded-lg border border-[#10b981] bg-[#10b981]/10 px-5 text-sm font-semibold text-[#10b981] transition hover:bg-[#10b981]/20 disabled:opacity-40"
          >
            {loading === "join" ? "..." : "입장"}
          </button>
        </div>

        {error && <p className="text-center text-sm text-[#f43f5e]">{error}</p>}

        <p className="pt-2 text-center text-[11px] text-white/25">
          2~4명 · 고1 통합과학 지질시대 퀴즈 · 약 3분
        </p>
      </div>
    </main>
  );
}
