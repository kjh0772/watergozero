/**
 * 실제 공급 시퀀스: 구역 1→12 순차 실행
 * 1회 공급 요청 시 호출, 구역별 duration_seconds 만큼 대기 후 다음 구역
 * Modbus 연결 시 각 구역 전환/종료 시 실제 릴레이(밸브·펌프) 출력
 */

import { getSupplyDb, getRecordsDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import {
  getPendingCommand,
  getRunState,
  setPendingCommand,
  clearPendingCommand,
  setRunState,
  clearRunState,
  isStopRequested,
} from "@/lib/control";
import { applyRunStateToModbus, turnOffAllRelays } from "@/lib/modbus/writeRelay";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ZoneRow {
  zone_id: number;
  name: string;
  duration_seconds: number;
  enabled: number;
}

/** 1회 공급 시퀀스 실행 (비동기, 호출부에서 await 하지 않음) */
export async function runSupplySequence(): Promise<void> {
  if (getRunState().running) return;
  if (getPendingCommand() !== "start_once") return;

  setPendingCommand(null);
  const supplyDb = getSupplyDb();
  const recordsDb = getRecordsDb();
  const zones = supplyDb
    .prepare(
      "SELECT zone_id, name, duration_seconds, enabled FROM zone_settings WHERE enabled = 1 AND zone_id <= ? ORDER BY zone_id"
    )
    .all(ZONE_COUNT) as ZoneRow[];

  for (const zone of zones) {
    if (isStopRequested()) {
      await turnOffAllRelays();
      clearRunState();
      clearPendingCommand();
      break;
    }

    const valveIndex = zone.zone_id - 1;
    const valves = Array(ZONE_COUNT).fill(0);
    if (valveIndex >= 0 && valveIndex < ZONE_COUNT) valves[valveIndex] = 1;

    setRunState({
      running: true,
      currentZone: zone.zone_id,
      currentZoneStartedAt: Date.now(),
      currentZoneDuration: zone.duration_seconds,
      pumps: { p1: 1, p2: 1 },
      valves,
    });
    // 변경: 실제 Modbus 릴레이 출력 (구역 밸브 + P1/P2 펌프)
    await applyRunStateToModbus(valves, { p1: 1, p2: 1 });

    const startedAt = new Date().toISOString();
    const insert = recordsDb
      .prepare(
        "INSERT INTO supply_records (started_at, zone_id, pump_p1, pump_p2, valve_states) VALUES (?, ?, 1, 1, ?)"
      )
      .run(startedAt, zone.zone_id, JSON.stringify(valves));
    const recordId = Number((insert as { lastInsertRowid: number | bigint }).lastInsertRowid);

    const durationMs = Math.max(0, zone.duration_seconds) * 1000;
    const stepMs = 1000;
    let elapsed = 0;
    while (elapsed < durationMs) {
      if (isStopRequested()) {
        await turnOffAllRelays();
        clearRunState();
        clearPendingCommand();
        recordsDb.prepare("UPDATE supply_records SET ended_at = ? WHERE id = ?").run(new Date().toISOString(), recordId);
        break;
      }
      await delay(Math.min(stepMs, durationMs - elapsed));
      elapsed += stepMs;
    }

    if (elapsed >= durationMs) {
      recordsDb.prepare("UPDATE supply_records SET ended_at = ? WHERE id = ?").run(new Date().toISOString(), recordId);
    }
  }

  await turnOffAllRelays();
  clearRunState();
  clearPendingCommand();
}
