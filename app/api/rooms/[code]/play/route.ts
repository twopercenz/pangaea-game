import { NextRequest, NextResponse } from "next/server";
import { playCard, sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { rooms } from "@/lib/store";
import { PlateId } from "@/lib/types";

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
  const { playerId, cardId, targetPlateId } = body as {
    playerId: string;
    cardId: string;
    targetPlateId: PlateId | null;
  };

  try {
    playCard(room, playerId, cardId, targetPlateId ?? null);
    return NextResponse.json({ room: sanitizeRoomForPlayer(room, playerId) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
