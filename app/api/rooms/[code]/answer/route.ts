import { NextRequest, NextResponse } from "next/server";
import { answerQuiz } from "@/lib/gameLogic";
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
  const { playerId, answerIndex } = body as { playerId: string; answerIndex: number };

  try {
    answerQuiz(room, playerId, answerIndex);
    await setRoom(room.code, room);
    return NextResponse.json({ room });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
