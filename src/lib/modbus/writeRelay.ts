/**
 * RunState(밸브/펌프)를 Modbus PLC 코일로 출력
 * 공급 시퀀스에서 구역 전환·종료 시 호출하여 실제 릴레이 동작
 */

import { getSystemDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import { writeCoils, isConnected } from "./client";
import { buildCoilArrayFromRunState } from "./relayMap";
import { COIL_WRITE_BASE } from "./config";

const ZERO_VALVES = Array(ZONE_COUNT).fill(0) as number[];
const ZERO_PUMPS = { p1: 0, p2: 0 };

/**
 * 현재 밸브/펌프 상태를 PLC 코일(16개)로 전송.
 * Modbus 미연결 시 무시, 오류 시 로그만 남기고 예외 전파하지 않음.
 */
export async function applyRunStateToModbus(
  valves: number[],
  pumps: { p1: number; p2: number }
): Promise<void> {
  if (!isConnected()) return;
  try {
    const plc = getSystemDb()
      .prepare("SELECT slave_id FROM plc_settings WHERE id = 1")
      .get() as { slave_id: number } | undefined;
    const slaveId = plc?.slave_id ?? 1;
    const coils = buildCoilArrayFromRunState(valves, pumps);
    await writeCoils(COIL_WRITE_BASE, coils, slaveId);
  } catch (e) {
    console.error("applyRunStateToModbus", e);
  }
}

/** 모든 릴레이 OFF (밸브 0, 펌프 0) */
export async function turnOffAllRelays(): Promise<void> {
  await applyRunStateToModbus(ZERO_VALVES, ZERO_PUMPS);
}
