import { RoomState } from "./types";

// Vercel 서버리스 환경에서 핫리로드/모듈 재평가에도 살아남도록 globalThis에 저장.
// 주의: 서버리스 인스턴스가 여러 개로 스케일되면 인스턴스마다 메모리가 분리되어
// 상태가 어긋날 수 있습니다. 소규모 교실용 동시 접속(수십 명 이하) 규모에서는
// 보통 하나의 인스턴스로 충분히 처리되지만, 트래픽이 커지면 Vercel KV 등
// 외부 저장소로 교체하는 것을 권장합니다.
declare global {
  var __PANGAEA_ROOMS__: Map<string, RoomState> | undefined;
}

export const rooms: Map<string, RoomState> =
  globalThis.__PANGAEA_ROOMS__ ?? (globalThis.__PANGAEA_ROOMS__ = new Map());

const ROOM_TTL_MS = 1000 * 60 * 60 * 3; // 3시간 후 자동 정리

export function cleanupOldRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}
