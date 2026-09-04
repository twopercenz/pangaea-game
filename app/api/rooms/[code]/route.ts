import { NextRequest, NextResponse } from "next/server";
import { sanitizeRoomForPlayer } from "@/lib/gameLogic";
import { getRoom } from "@/lib/store";

// 폴링 응답은 절대 캐시되면 안 되고, 대신 아래 v(버전) 비교로 재전송을 없앤다.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json(
      { error: "방을 찾을 수 없습니다." },
      { status: 404, headers: NO_STORE }
    );
  }

  // 클라이언트가 마지막으로 받은 버전(updatedAt)을 같이 보내면, 바뀐 게 없을 때
  // 방 상태 전체 대신 20바이트짜리 응답만 돌려준다. 1.5초 폴링의 대부분이 여기 걸린다.
  const since = req.nextUrl.searchParams.get("v");
  if (since && Number(since) === room.updatedAt) {
    return NextResponse.json({ unchanged: true }, { headers: NO_STORE });
  }

  const viewerId = req.nextUrl.searchParams.get("playerId");
  return NextResponse.json(
    { room: sanitizeRoomForPlayer(room, viewerId) },
    { headers: NO_STORE }
  );
}
