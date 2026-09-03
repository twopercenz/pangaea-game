"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <main className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-6">
      {/* radial glow + crosshair grid, matching board aesthetic */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/5" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/5" />

      <Card className="relative w-full max-w-sm border border-primary/40">
        <CardHeader className="text-center">
          <CardTitle className="text-display justify-self-center">판게아</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            퀴즈를 맞혀 조각을 모아 로라시아와 곤드와나를 만들고, 두 초대륙을 충돌시켜 판게아를 완성하세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Input
            className="h-auto rounded-lg px-4 py-3 text-sm"
            placeholder="닉네임"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
          />

          <Button
            onClick={createRoom}
            disabled={loading !== null}
            className="h-auto w-full rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-40"
          >
            {loading === "create" ? "생성 중..." : "새 방 만들기"}
          </Button>

          <div className="text-eyebrow flex items-center gap-3 uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-white/10" />
            또는
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <Input
              className="h-auto flex-1 rounded-lg px-4 py-3 text-center text-sm uppercase tracking-widest focus-visible:border-[var(--emerald)]"
              placeholder="방 코드"
              value={joinCode}
              maxLength={4}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <Button
              onClick={joinRoom}
              disabled={loading !== null}
              className="h-auto rounded-lg border border-[var(--emerald)] bg-[var(--emerald)]/10 px-5 text-sm font-semibold text-[var(--emerald)] hover:bg-[var(--emerald)]/20 disabled:opacity-40"
            >
              {loading === "join" ? "..." : "입장"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="justify-center text-center">
              <AlertDescription className="text-center">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t-0 bg-transparent p-0 pb-6">
          <p className="text-center text-[11px] text-muted-foreground">
            2~4명 · 고1 통합과학 지질시대 퀴즈 · 약 3분
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
