/**
 * 제어 명령 처리 완료 확인 (컨트롤러가 명령 실행 후 호출)
 */

import { NextRequest, NextResponse } from "next/server";
import { clearPendingCommand, getPendingCommand } from "@/lib/control";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { command } = body as { command?: string };
  const current = getPendingCommand();
  if (command && current === command) {
    clearPendingCommand();
  } else if (!command) {
    clearPendingCommand();
  }
  return NextResponse.json({ ok: true });
}
