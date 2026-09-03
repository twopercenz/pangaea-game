import { NextRequest, NextResponse } from "next/server";
import { sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { getRoom } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }
  const viewerId = req.nextUrl.searchParams.get("playerId");
  return NextResponse.json({ room: sanitizeRoomForPlayer(room, viewerId) });
}
