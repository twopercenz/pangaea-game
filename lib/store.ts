import { getStore } from "@netlify/blobs";
import { RoomState } from "./types";

// 서버리스 함수(특히 Netlify Functions)는 요청마다 다른 인스턴스에서 실행될 수 있어
// globalThis 메모리만으로는 인스턴스 간 상태 공유가 보장되지 않는다.
// (이게 배포 후 "방을 찾을 수 없습니다" 에러로 게임이 끊기던 원인이었음)
// Netlify Blobs가 쓸 수 있으면 그걸 진짜 저장소로 쓰고, 로컬 개발(next dev)처럼
// Netlify 런타임이 아닌 곳에서는 기존 in-memory Map으로 자연스럽게 폴백한다.
declare global {
  var __PANGAEA_ROOMS__: Map<string, RoomState> | undefined;
}

const memoryRooms: Map<string, RoomState> =
  globalThis.__PANGAEA_ROOMS__ ?? (globalThis.__PANGAEA_ROOMS__ = new Map());

const ROOM_TTL_MS = 1000 * 60 * 60 * 3; // 3시간 후 자동 정리

function tryGetBlobStore() {
  try {
    return getStore({ name: "pangaea-rooms", consistency: "strong" });
  } catch {
    // Netlify Blobs 컨텍스트가 없는 환경(로컬 dev 등) — in-memory로 폴백.
    return null;
  }
}

export async function getRoom(code: string): Promise<RoomState | undefined> {
  const store = tryGetBlobStore();
  if (!store) return memoryRooms.get(code);
  const data = await store.get(code, { type: "json" });
  return (data as RoomState | null) ?? undefined;
}

export async function setRoom(code: string, room: RoomState): Promise<void> {
  const store = tryGetBlobStore();
  if (!store) {
    memoryRooms.set(code, room);
    return;
  }
  await store.setJSON(code, room);
}

export async function deleteRoom(code: string): Promise<void> {
  const store = tryGetBlobStore();
  if (!store) {
    memoryRooms.delete(code);
    return;
  }
  await store.delete(code);
}

export async function cleanupOldRooms() {
  const now = Date.now();
  const store = tryGetBlobStore();
  if (!store) {
    for (const [code, room] of memoryRooms) {
      if (now - room.updatedAt > ROOM_TTL_MS) {
        memoryRooms.delete(code);
      }
    }
    return;
  }
  const { blobs } = await store.list();
  await Promise.all(
    blobs.map(async ({ key }) => {
      const room = (await store.get(key, { type: "json" })) as RoomState | null;
      if (room && now - room.updatedAt > ROOM_TTL_MS) {
        await store.delete(key);
      }
    })
  );
}
