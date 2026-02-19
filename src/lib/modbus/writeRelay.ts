/**
 * RunState(밸브/펌프)를 Modbus PLC 코일로 출력
 * 공급 시퀀스에서 구역 전환·종료 시 호출하여 실제 릴레이 동작
 * 라즈베리파이에서 Waveshare 8ch 릴레이 보드 사용 시 1032~1039(앞 8ch) 동시 출력
 */

import { getSystemDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import { writeCoils, isConnected } from "./client";
import { buildCoilArrayFromRunState } from "./relayMap";
import { COIL_WRITE_BASE } from "./config";
import { writeRelayBoard } from "@/lib/relayBoard/waveshareRpi8ch";

const ZERO_VALVES = Array(ZONE_COUNT).fill(0) as number[];
const ZERO_PUMPS = { p1: 0, p2: 0 };

/**
 * 현재 밸브/펌프 상태를 PLC 코일(16개)로 전송.
 * Modbus 연결 시 PLC에 쓰고, 라즈베리파이에서는 동일 값으로 릴레이 보드 Ch1~8(1032~1039) 동시 출력.
 * Modbus 미연결 시에도 릴레이 보드는 출력함 (로컬 8ch만 사용 가능).
 */
export async function applyRunStateToModbus(
  valves: number[],
  pumps: { p1: number; p2: number }
): Promise<void> {
  try {
    const coils = buildCoilArrayFromRunState(valves, pumps);

    if (isConnected()) {
      const plc = getSystemDb()
        .prepare("SELECT slave_id FROM plc_settings WHERE id = 1")
        .get() as { slave_id: number } | undefined;
      const slaveId = plc?.slave_id ?? 1;
      await writeCoils(COIL_WRITE_BASE, coils, slaveId);
    }

    // Waveshare RPi Relay Board 8ch: 1032=Ch1 ~ 1039=Ch8 동시 출력 (Linux에서만 동작)
    writeRelayBoard(coils.slice(0, 8));
  } catch (e) {
    console.error("applyRunStateToModbus", e);
  }
}

/** 모든 릴레이 OFF (밸브 0, 펌프 0) */
export async function turnOffAllRelays(): Promise<void> {
  await applyRunStateToModbus(ZERO_VALVES, ZERO_PUMPS);
}
