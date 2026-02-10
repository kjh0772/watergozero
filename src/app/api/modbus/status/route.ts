/**
 * Modbus 연결 상태 API
 * - 연결 여부, 현재 포트, 선택 가능 포트 목록
 */

import { NextResponse } from "next/server";
import { getCurrentPort, isConnected } from "@/lib/modbus/client";
import { DEFAULT_PORTS } from "@/lib/modbus/config";
import { getSystemDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connected = isConnected();
    const currentPort = getCurrentPort();

    // 포트 목록: 기본 포트 + DB에 저장된 포트(없으면 추가)
    const db = getSystemDb();
    const plc = db.prepare("SELECT modbus_port FROM plc_settings WHERE id = 1").get() as
      | { modbus_port: string }
      | undefined;
    const savedPort = plc?.modbus_port?.trim() || "";
    const ports =
      savedPort && !DEFAULT_PORTS.includes(savedPort)
        ? [savedPort, ...DEFAULT_PORTS]
        : [...DEFAULT_PORTS];

    return NextResponse.json({
      connected,
      currentPort,
      ports,
    });
  } catch (e) {
    console.error("modbus status", e);
    return NextResponse.json(
      { error: "상태 조회 실패", connected: false, currentPort: null, ports: [] },
      { status: 500 }
    );
  }
}
