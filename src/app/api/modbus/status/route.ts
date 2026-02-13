/**
 * Modbus 연결 상태 API
 * - 연결 여부, 현재 포트, 선택 가능 포트 목록 (Linux: 실제 존재하는 /dev/ 포트만 반환)
 */

import { existsSync } from "fs";
import { NextResponse } from "next/server";
import { getCurrentPort, isConnected } from "@/lib/modbus/client";
import { DEFAULT_PORTS } from "@/lib/modbus/config";
import { getSystemDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Linux에서 /dev/ 경로가 실제로 존재하는 포트만 필터 (없는 /dev/serial1 등 제외) */
function filterExistingPorts(ports: string[]): string[] {
  if (typeof process === "undefined" || process.platform !== "linux") return ports;
  return ports.filter((p) => !p.startsWith("/dev/") || existsSync(p));
}

export async function GET() {
  try {
    const connected = isConnected();
    const currentPort = getCurrentPort();

    // 포트 목록: 기본 포트 + DB에 저장된 포트(없으면 추가), Linux는 존재하는 포트만
    const db = getSystemDb();
    const plc = db.prepare("SELECT modbus_port FROM plc_settings WHERE id = 1").get() as
      | { modbus_port: string }
      | undefined;
    const savedPort = plc?.modbus_port?.trim() || "";
    const rawPorts =
      savedPort && !DEFAULT_PORTS.includes(savedPort)
        ? [savedPort, ...DEFAULT_PORTS]
        : [...DEFAULT_PORTS];
    const ports = filterExistingPorts(rawPorts);

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
