/**
 * Modbus 연결/재연결 API
 * - 재연결 시 기존 연결을 먼저 끊고, 대기 후 새로 연결 (중복 시도·포트 잠금 방지)
 * - 포트 잠금 오류 시 2초 대기 후 1회 재시도
 * - body: { port: string, baudRate?: number }
 */

import { existsSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { closeModbus, getCurrentPort, initModbus, isConnected } from "@/lib/modbus/client";
import { MODBUS_BAUD_RATE } from "@/lib/modbus/config";
import { getSystemDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const isPortLockError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return /Cannot lock port|Resource temporarily unavailable|EAGAIN|EBUSY/i.test(msg);
};

// 동시 연결 요청 방지 (한 요청이 끝날 때까지 대기)
let connectLock: Promise<NextResponse> = Promise.resolve(NextResponse.json({ ok: true, port: "" }));

export async function POST(request: NextRequest): Promise<NextResponse> {
  const run = async (): Promise<NextResponse> => {
    const body = await request.json().catch(() => ({}));
    const port = typeof body.port === "string" ? body.port.trim() : "";
    if (!port) {
      return NextResponse.json({ error: "포트를 지정해 주세요." }, { status: 400 });
    }

    // Linux: 포트 경로가 없으면 연결 시도하지 않음 (/dev/serial1 등)
    if (port.startsWith("/dev/") && !existsSync(port)) {
      return NextResponse.json({ error: `포트가 없습니다: ${port}` }, { status: 400 });
    }

    // 이미 같은 포트로 연결된 경우 재연결하지 않음 (instrumentation 자동 연결 후 중복 시도 방지)
    if (isConnected() && getCurrentPort() === port) {
      return NextResponse.json({ ok: true, port });
    }

    let baudRate = typeof body.baudRate === "number" ? body.baudRate : undefined;
    if (baudRate == null) {
      const db = getSystemDb();
      const plc = db.prepare("SELECT baud_rate FROM plc_settings WHERE id = 1").get() as
        | { baud_rate: number }
        | undefined;
      baudRate = plc?.baud_rate ?? MODBUS_BAUD_RATE;
    }

    const doConnect = async (): Promise<void> => {
      await closeModbus();
      await new Promise((r) => setTimeout(r, 400));
      await initModbus(port, baudRate!);
    };

    try {
      await doConnect();
    } catch (e) {
      if (isPortLockError(e)) {
        await new Promise((r) => setTimeout(r, 2000));
        await doConnect();
      } else {
        throw e;
      }
    }
    return NextResponse.json({ ok: true, port });
  };

  try {
    connectLock = connectLock.then(() => run(), () => run());
    return await connectLock;
  } catch (e) {
    const message = e instanceof Error ? e.message : "연결 실패";
    console.error("modbus connect", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
