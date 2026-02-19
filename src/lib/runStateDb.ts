/**
 * 공급 동작 상태 DB 저장/조회 (트리거·API 간 공유)
 * 메인 동작 카드에 시간 트리거로 시작한 공급 상태가 확실히 반영되도록 함
 */

import { getSystemDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import type { RunState } from "@/lib/control";

export function persistRunState(state: RunState | null): void {
  try {
    const db = getSystemDb();
    if (!state?.running) {
      db.prepare(
        `INSERT OR REPLACE INTO run_state (id, running, current_zone, current_zone_started_at, current_zone_duration, pumps_json, valves_json, updated_at)
         VALUES (1, 0, NULL, NULL, NULL, ?, ?, datetime('now'))`
      ).run(JSON.stringify({ p1: 0, p2: 0 }), JSON.stringify(Array(ZONE_COUNT).fill(0)));
      return;
    }
    const pumps = state.pumps ?? { p1: 0, p2: 0 };
    const valves = Array.isArray(state.valves) ? state.valves : Array(ZONE_COUNT).fill(0);
    db.prepare(
      `INSERT OR REPLACE INTO run_state (id, running, current_zone, current_zone_started_at, current_zone_duration, pumps_json, valves_json, updated_at)
       VALUES (1, 1, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      state.currentZone ?? null,
      state.currentZoneStartedAt ?? null,
      state.currentZoneDuration ?? null,
      JSON.stringify(pumps),
      JSON.stringify(valves)
    );
  } catch (e) {
    console.warn("[runStateDb] persistRunState", e);
  }
}

/** DB에 저장된 동작 상태 조회 (running=1일 때만 유효한 상태 반환) */
export function getRunStateFromDb(): RunState | null {
  try {
    const db = getSystemDb();
    const row = db.prepare("SELECT running, current_zone, current_zone_started_at, current_zone_duration, pumps_json, valves_json FROM run_state WHERE id = 1").get() as
      | {
          running: number;
          current_zone: number | null;
          current_zone_started_at: number | null;
          current_zone_duration: number | null;
          pumps_json: string;
          valves_json: string;
        }
      | undefined;
    if (!row || row.running !== 1) return null;
    let pumps = { p1: 0, p2: 0 };
    let valves = Array(ZONE_COUNT).fill(0) as number[];
    try {
      if (row.pumps_json) pumps = { ...pumps, ...JSON.parse(row.pumps_json) };
      if (row.valves_json) {
        const arr = JSON.parse(row.valves_json);
        if (Array.isArray(arr)) valves = arr.slice(0, ZONE_COUNT).map((v: unknown) => Number(v) || 0);
      }
    } catch {
      // ignore
    }
    return {
      running: true,
      currentZone: row.current_zone ?? null,
      currentZoneStartedAt: row.current_zone_started_at ?? null,
      currentZoneDuration: row.current_zone_duration ?? null,
      pumps,
      valves,
    };
  } catch (e) {
    console.warn("[runStateDb] getRunStateFromDb", e);
    return null;
  }
}
