/**
 * 공급 정지 API — 수동제어 > 공급정지 버튼
 * 즉시 모든 공급 리셋: 밸브·펌프 릴레이 전부 OFF, run state 초기화.
 * 실행 중인 시퀀스는 isStopRequested()로 다음 폴링에서 종료.
 */

import { NextResponse } from "next/server";
import { setPendingCommand, clearRunState } from "@/lib/control";
import { turnOffAllRelays } from "@/lib/modbus/writeRelay";

export const dynamic = "force-dynamic";

export async function POST() {
  setPendingCommand("stop");
  try {
    await turnOffAllRelays();
  } catch (e) {
    console.error("turnOffAllRelays on stop", e);
  }
  clearRunState();
  return NextResponse.json({ ok: true, message: "모든 공급이 리셋되었습니다." });
}
