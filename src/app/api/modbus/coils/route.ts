/**
 * 코일 테스트: 1032~1047 코일 읽기(GET) / 쓰기(POST)
 */

import { NextRequest, NextResponse } from "next/server";
import { readCoils, writeCoils, isConnected } from "@/lib/modbus/client";
import { COIL_WRITE_BASE, COIL_WRITE_LENGTH } from "@/lib/modbus/config";
import { getSystemDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function getSlaveId(): number {
  const plc = getSystemDb()
    .prepare("SELECT slave_id FROM plc_settings WHERE id = 1")
    .get() as { slave_id: number } | undefined;
  return plc?.slave_id ?? 1;
}

/** 현재 코일 상태 읽기 (1032~1047, 16개) */
export async function GET() {
  if (!isConnected()) {
    return NextResponse.json({ error: "Modbus 미연결" }, { status: 503 });
  }
  try {
    const slaveId = getSlaveId();
    const coils = await readCoils(COIL_WRITE_BASE, COIL_WRITE_LENGTH, slaveId);
    const arr = Array.isArray(coils) && coils.length >= COIL_WRITE_LENGTH
      ? coils.slice(0, COIL_WRITE_LENGTH)
      : Array(COIL_WRITE_LENGTH).fill(false);
    return NextResponse.json({ coils: arr });
  } catch (e) {
    console.error("modbus coils GET", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "코일 읽기 실패" },
      { status: 500 }
    );
  }
}

/** 코일 16개 쓰기 (body: { coils: boolean[] }) */
export async function POST(request: NextRequest) {
  if (!isConnected()) {
    return NextResponse.json({ error: "Modbus 미연결" }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const coils = body.coils;
    if (!Array.isArray(coils) || coils.length < COIL_WRITE_LENGTH) {
      return NextResponse.json(
        { error: `coils 배열 ${COIL_WRITE_LENGTH}개 필요` },
        { status: 400 }
      );
    }
    const arr = coils.slice(0, COIL_WRITE_LENGTH).map((v: unknown) => Boolean(v));
    const slaveId = getSlaveId();
    await writeCoils(COIL_WRITE_BASE, arr, slaveId);
    return NextResponse.json({ ok: true, coils: arr });
  } catch (e) {
    console.error("modbus coils POST", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "코일 쓰기 실패" },
      { status: 500 }
    );
  }
}
