/**
 * 메인 페이지용 실시간 상태 API
 * 현재시각, 센서, 물탱크, 펌프/밸브 (실제 하드웨어 연동 전 모의값 지원)
 */

import { NextResponse } from "next/server";
import { getSystemDb, getSupplyDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import {
  getPendingCommand,
  getRunState,
  getLastTankP1State,
  setLastTankP1State,
} from "@/lib/control";
import { getRunStateFromDb } from "@/lib/runStateDb";
import { APP_VERSION } from "@/lib/version";
import { getCurrentPort, isConnected } from "@/lib/modbus/client";
import { startTriggerScheduler, getLastFiredTrigger } from "@/lib/triggerScheduler";
import type { LiveStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  startTriggerScheduler();
  try {
    const db = getSystemDb();
    const now = new Date();

    // 센서 연결 상태 조회 (실제 값은 PLC/센서 연동 시 대체)
    const sensorsRows = db.prepare("SELECT * FROM sensor_connections").all() as {
      sensor_type: string;
      enabled: number;
    }[];
    const sensorMap: Record<string, number | null> = {};
    sensorsRows.forEach((r) => {
      if (r.sensor_type !== "tank_level") {
        // 모의값: 하드웨어 연동 전
        sensorMap[r.sensor_type] = r.enabled
          ? mockSensorValue(r.sensor_type)
          : null;
      }
    });

    // 물탱크 캘리브레이션으로 AD -> cm 변환
    const cal = db.prepare("SELECT * FROM tank_calibration WHERE id = 1").get() as {
      ad_min: number;
      ad_max: number;
      cm_min: number;
      cm_max: number;
    } | undefined;
    const adMin = cal?.ad_min ?? 0;
    const adMax = cal?.ad_max ?? 1023;
    const cmMin = cal?.cm_min ?? 0;
    const cmMax = cal?.cm_max ?? 100;
    const ad = 512; // 모의 AD 값
    const cm = cmMin + ((ad - adMin) / (adMax - adMin || 1)) * (cmMax - cmMin);
    const cmRounded = Math.round(cm * 10) / 10;

    // DB에 저장된 동작 상태 우선 (시간 트리거 등 모든 경로에서 메인 동작 카드에 반영)
    const runFromDb = getRunStateFromDb();
    const run = runFromDb ?? getRunState();
    let p1: number;
    let p2: number;
    if (run.running) {
      p1 = run.pumps.p1;
      p2 = run.pumps.p2;
    } else {
      p2 = 0;
      let pumpSettings = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get() as
        | { start_level_cm: number; stop_level_cm: number }
        | undefined;
      if (!pumpSettings) {
        db.prepare("INSERT OR IGNORE INTO tank_pump_settings (id, start_level_cm, stop_level_cm) VALUES (1, 20, 80)").run();
        pumpSettings = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get() as
          | { start_level_cm: number; stop_level_cm: number }
          | undefined;
      }
      const startCm = pumpSettings?.start_level_cm ?? 20;
      const stopCm = pumpSettings?.stop_level_cm ?? 80;
      if (cmRounded <= startCm) {
        setLastTankP1State(1);
        p1 = 1;
      } else if (cmRounded >= stopCm) {
        setLastTankP1State(0);
        p1 = 0;
      } else {
        p1 = getLastTankP1State();
      }
    }

    let remainingSeconds: number | null = null;
    if (run.running && run.currentZoneStartedAt != null && run.currentZoneDuration != null) {
      const elapsed = (Date.now() - run.currentZoneStartedAt) / 1000;
      remainingSeconds = Math.max(0, Math.ceil(run.currentZoneDuration - elapsed));
    }

    let tankPumpLevels: { start_level_cm: number; stop_level_cm: number };
    let pumpSettingsForBar = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get() as
      | { start_level_cm: number; stop_level_cm: number }
      | undefined;
    if (!pumpSettingsForBar) {
      db.prepare("INSERT OR IGNORE INTO tank_pump_settings (id, start_level_cm, stop_level_cm) VALUES (1, 20, 80)").run();
      pumpSettingsForBar = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get() as
        | { start_level_cm: number; stop_level_cm: number }
        | undefined;
    }
    tankPumpLevels = {
      start_level_cm: pumpSettingsForBar?.start_level_cm ?? 20,
      stop_level_cm: pumpSettingsForBar?.stop_level_cm ?? 80,
    };

    // 구역별 설정 공급시간(초), 공급 선택(enabled) — 잔여시간 상시 표기 및 대기/비활성 색상 구분용
    const supplyDb = getSupplyDb();
    const zoneRows = supplyDb
      .prepare("SELECT zone_id, duration_seconds, enabled FROM zone_settings WHERE zone_id <= ? ORDER BY zone_id")
      .all(ZONE_COUNT) as { zone_id: number; duration_seconds: number; enabled: number }[];
    const zoneDurations = Array(ZONE_COUNT).fill(0);
    const zoneEnabled = Array(ZONE_COUNT).fill(false);
    zoneRows.forEach((r) => {
      if (r.zone_id >= 1 && r.zone_id <= ZONE_COUNT) {
        zoneDurations[r.zone_id - 1] = r.duration_seconds ?? 0;
        zoneEnabled[r.zone_id - 1] = !!r.enabled;
      }
    });

    // PLC(Modbus) 실제 연결 상태 반영 (메인 화면 표시용)
    let plcConnected = false;
    let plcCurrentPort: string | null = null;
    try {
      plcConnected = isConnected();
      plcCurrentPort = getCurrentPort();
    } catch {
      // modbus 미사용 시
    }

    // 공급 트리거 예약 요약 (메인 예약 카드용)
    let triggerSummary: LiveStatus["triggerSummary"] = null;
    try {
      const modeRow = supplyDb.prepare("SELECT mode, weekly_days FROM supply_mode WHERE id = 1").get() as
        | { mode: string; weekly_days: string }
        | undefined;
      const triggerRow = supplyDb.prepare("SELECT trigger_type, time_slots, interval_minutes FROM supply_trigger WHERE id = 1").get() as
        | { trigger_type: string; time_slots: string; interval_minutes: number | null }
        | undefined;
      if (modeRow && triggerRow) {
        let weeklyDays: number[] | undefined;
        if (modeRow.weekly_days) {
          try {
            const parsed = JSON.parse(modeRow.weekly_days);
            weeklyDays = Array.isArray(parsed) ? parsed.filter((n: unknown) => typeof n === "number") : undefined;
          } catch {
            // ignore
          }
        }
        let timeSlots: string[] | undefined;
        if (triggerRow.time_slots) {
          try {
            const parsed = JSON.parse(triggerRow.time_slots);
            timeSlots = Array.isArray(parsed) ? parsed.map((s: unknown) => String(s)) : undefined;
          } catch {
            // ignore
          }
        }
        triggerSummary = {
          mode: modeRow.mode === "weekly" ? "weekly" : "daily",
          weeklyDays,
          triggerType: triggerRow.trigger_type === "interval" ? "interval" : "time",
          timeSlots,
          intervalMinutes: triggerRow.interval_minutes ?? null,
        };
      }
    } catch {
      // ignore
    }

    const status: LiveStatus = {
      version: APP_VERSION,
      currentTime: now.toISOString(),
      controlPending: getPendingCommand(),
      running: run.running,
      currentZone: run.currentZone,
      remainingSeconds,
      sensors: {
        temperature: sensorMap["temperature"] ?? null,
        humidity: sensorMap["humidity"] ?? null,
        soil_moisture: sensorMap["soil_moisture"] ?? null,
        soil_temp: sensorMap["soil_temp"] ?? null,
      },
      tankLevel: { ad, cm: cmRounded },
      tankPumpLevels,
      pumps: { p1, p2 },
      valves: run.running ? run.valves : Array(ZONE_COUNT).fill(0),
      zoneDurations,
      zoneEnabled,
      plcConnected,
      plcCurrentPort,
      triggerSummary,
      lastFiredTrigger: getLastFiredTrigger(),
    };

    return NextResponse.json(status);
  } catch (e) {
    console.error("status API error", e);
    return NextResponse.json(
      { error: "상태 조회 실패" },
      { status: 500 }
    );
  }
}

function mockSensorValue(type: string): number {
  const seed = (Date.now() / 10000) % 1;
  switch (type) {
    case "temperature":
      return Math.round((20 + seed * 15) * 10) / 10;
    case "humidity":
      return Math.round((40 + seed * 40) * 10) / 10;
    case "soil_moisture":
      return Math.round((30 + seed * 50) * 10) / 10;
    case "soil_temp":
      return Math.round((18 + seed * 10) * 10) / 10;
    default:
      return 0;
  }
}
