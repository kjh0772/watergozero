/**
 * 1회 공급 요청 API
 * 대기 명령 설정 후 실제 공급 시퀀스 비동기 실행 (구역 1→12 순차)
 */

import { NextResponse } from "next/server";
import { setPendingCommand } from "@/lib/control";
import { runSupplySequence } from "@/lib/runSupplySequence";

export const dynamic = "force-dynamic";

export async function POST() {
  setPendingCommand("start_once");
  runSupplySequence(); // 비동기 실행, 응답은 즉시 반환
  return NextResponse.json({ ok: true, message: "1회 공급이 요청되었습니다." });
}
