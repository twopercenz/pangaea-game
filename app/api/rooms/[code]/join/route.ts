import { NextRequest, NextResponse } from "next/server";
import { joinRoom, sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { getRoom, setRoom } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.slice(0, 20) : "";

  try {
    const player = joinRoom(room, name);
    await setRoom(room.code, room);
    return NextResponse.json({ room: sanitizeRoomForPlayer(room, player.id), playerId: player.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
