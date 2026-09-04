import { RoomState, Stage } from "./types";

/** 6조각이 모두 완성되면 두 초대륙이 완성된 것이므로, 판게아 합체 단계로 넘어간다. */
// 보드(클라이언트 컴포넌트)도 쓰는 함수라 별도 모듈로 뺐다 — gameLogic에서 import하면
// 퀴즈 은행/덱 생성 같은 서버 전용 코드까지 클라이언트 번들에 딸려 들어간다.
export function stageOf(room: Pick<RoomState, "plates">): Stage {
  return room.plates.every((p) => p.completedBy) ? "merge" : "assemble";
}
