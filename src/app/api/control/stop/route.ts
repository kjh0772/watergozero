/**
 * 공급 정지 요청 API
 * 메인 페이지 '공급 정지' 버튼에서 호출. 컨트롤러가 GET /api/control/status 로 폴링하여 실행.
 */

import { NextResponse } from "next/server";
import { setPendingCommand } from "@/lib/control";

export const dynamic = "force-dynamic";

export async function POST() {
  setPendingCommand("stop");
  return NextResponse.json({ ok: true, message: "공급 정지가 요청되었습니다." });
}
