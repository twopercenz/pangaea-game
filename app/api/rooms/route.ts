import { NextRequest, NextResponse } from "next/server";
import { createRoom, sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { setRoom, cleanupOldRooms } from "@/lib/store";

export async function POST(req: NextRequest) {
  cleanupOldRooms();
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.slice(0, 20) : "";

  const room = createRoom(name);
  await setRoom(room.code, room);

  return NextResponse.json({ room: sanitizeRoomForPlayer(room, room.hostId), playerId: room.hostId });
}
