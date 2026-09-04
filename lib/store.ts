import { getStore } from "@netlify/blobs";
import { RoomState } from "./types";

// 서버리스 함수(특히 Netlify Functions)는 요청마다 다른 인스턴스에서 실행될 수 있어
// globalThis 메모리만으로는 인스턴스 간 상태 공유가 보장되지 않는다.
// (이게 배포 후 "방을 찾을 수 없습니다" 에러로 게임이 끊기던 원인이었음)
// Netlify Blobs가 쓸 수 있으면 그걸 진짜 저장소로 쓰고, 로컬 개발(next dev)처럼
// Netlify 런타임이 아닌 곳에서는 기존 in-memory Map으로 자연스럽게 폴백한다.
type BlobStore = ReturnType<typeof getStore>;

declare global {
  var __PANGAEA_ROOMS__: Map<string, RoomState> | undefined;
  var __PANGAEA_STORE__: { store: BlobStore | null } | undefined;
  var __PANGAEA_LAST_CLEANUP__: number | undefined;
}

const memoryRooms: Map<string, RoomState> =
  globalThis.__PANGAEA_ROOMS__ ?? (globalThis.__PANGAEA_ROOMS__ = new Map());

const ROOM_TTL_MS = 1000 * 60 * 60 * 3; // 3시간 후 자동 정리
const CLEANUP_INTERVAL_MS = 1000 * 60 * 10; // 인스턴스당 10분에 한 번만 훑는다

// getStore()는 매번 컨텍스트를 다시 읽고 클라이언트를 새로 만든다. 폴링 때문에
// 초당 수 회씩 불리는 경로라 인스턴스 수명 동안 한 번만 만들어 재사용한다.
function tryGetBlobStore(): BlobStore | null {
  const cached = globalThis.__PANGAEA_STORE__;
  if (cached) return cached.store;
  let store: BlobStore | null = null;
  try {
    store = getStore({ name: "pangaea-rooms", consistency: "strong" });
  } catch {
    // Netlify Blobs 컨텍스트가 없는 환경(로컬 dev 등) — in-memory로 폴백.
    store = null;
  }
  globalThis.__PANGAEA_STORE__ = { store };
  return store;
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

async function runCleanup(): Promise<void> {
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

/**
 * 방 만들기 응답이 blob 전체 스캔(방 개수만큼 get + delete)을 기다리느라 느려지던 걸 없앤다.
 * 정리는 여전히 돌지만 (1) 인스턴스당 10분에 한 번으로 묶고 (2) 응답을 막지 않는다.
 */
export function cleanupOldRooms(): void {
  const now = Date.now();
  const last = globalThis.__PANGAEA_LAST_CLEANUP__ ?? 0;
  if (now - last < CLEANUP_INTERVAL_MS) return;
  globalThis.__PANGAEA_LAST_CLEANUP__ = now;
  void runCleanup().catch(() => {
    // 정리는 부가 작업이라 실패해도 요청에 영향을 주지 않는다.
  });
}
