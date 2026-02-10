/**
 * 제어 대기 명령 조회 (컨트롤러 폴링용)
 * 컨트롤러가 명령 처리 후 POST /api/control/ack 로 초기화
 */

import { NextResponse } from "next/server";
import { getPendingCommand } from "@/lib/control";

export const dynamic = "force-dynamic";

export async function GET() {
  const pending = getPendingCommand();
  return NextResponse.json({ pending });
}
