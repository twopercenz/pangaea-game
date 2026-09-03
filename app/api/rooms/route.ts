import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/gameLogic";
import { setRoom, cleanupOldRooms } from "@/lib/store";

export async function POST(req: NextRequest) {
  await cleanupOldRooms();
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.slice(0, 20) : "";

  const room = createRoom(name);
  await setRoom(room.code, room);

  return NextResponse.json({ room, playerId: room.hostId });
}
