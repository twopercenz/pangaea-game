import { NextRequest, NextResponse } from "next/server";
import { startGame, sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { rooms } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  if (body?.playerId !== room.hostId) {
    return NextResponse.json({ error: "방장만 시작할 수 있습니다." }, { status: 403 });
  }
  try {
    startGame(room);
    return NextResponse.json({ room: sanitizeRoomForPlayer(room, body?.playerId ?? null) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
