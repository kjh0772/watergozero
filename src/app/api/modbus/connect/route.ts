/**
 * Modbus 연결/재연결 API
 * - body: { port: string, baudRate?: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { initModbus } from "@/lib/modbus/client";
import { MODBUS_BAUD_RATE } from "@/lib/modbus/config";
import { getSystemDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const port = typeof body.port === "string" ? body.port.trim() : "";
    if (!port) {
      return NextResponse.json({ error: "포트를 지정해 주세요." }, { status: 400 });
    }

    let baudRate = typeof body.baudRate === "number" ? body.baudRate : undefined;
    if (baudRate == null) {
      const db = getSystemDb();
      const plc = db.prepare("SELECT baud_rate FROM plc_settings WHERE id = 1").get() as
        | { baud_rate: number }
        | undefined;
      baudRate = plc?.baud_rate ?? MODBUS_BAUD_RATE;
    }

    await initModbus(port, baudRate);
    return NextResponse.json({ ok: true, port });
  } catch (e) {
    const message = e instanceof Error ? e.message : "연결 실패";
    console.error("modbus connect", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
