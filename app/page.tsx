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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a2a3a] to-[#0d1620] text-white p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">🌍 판게아</h1>
          <p className="text-white/60 text-sm">
            퀴즈를 맞혀 대륙 조각을 중심으로 밀어 넣고, 판게아를 완성하세요.
          </p>
        </div>

        <input
          className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 outline-none focus:border-emerald-400"
          placeholder="닉네임"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={createRoom}
          disabled={loading !== null}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 transition py-3 font-semibold"
        >
          {loading === "create" ? "생성 중..." : "새 방 만들기"}
        </button>

        <div className="flex items-center gap-3 text-white/40 text-xs">
          <div className="h-px flex-1 bg-white/20" />
          또는
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-3 outline-none focus:border-emerald-400 uppercase tracking-widest text-center"
            placeholder="방 코드"
            value={joinCode}
            maxLength={4}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={joinRoom}
            disabled={loading !== null}
            className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition px-5 font-semibold"
          >
            {loading === "join" ? "..." : "입장"}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <p className="text-white/30 text-xs text-center pt-4">
          2~4명 · 고1 통합과학 지질시대 퀴즈 · 약 3분
        </p>
      </div>
    </main>
  );
}
