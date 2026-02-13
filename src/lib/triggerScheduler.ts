/**
 * 공급 트리거 스케줄러
 * - 시간 등록: time_slots(예 08:00, 18:00)에 맞으면 1회 공급 실행
 * - 시간 간격: interval_minutes마다 1회 공급 실행
 * - 관수 방식(daily/weekly) 반영: weekly일 때 weekly_days 요일만 동작
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getSupplyDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";
import { getRunState } from "@/lib/control";
import { setPendingCommand } from "@/lib/control";
import { runSupplySequence } from "@/lib/runSupplySequence";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "trigger_state.json");

/** 트리거 발동 시 UI에 어떤 트리거였는지 표시용 */
export interface LastFiredTrigger {
  type: "time" | "interval";
  label: string;
  at: number;
}

interface TriggerState {
  lastIntervalRun: number | null;
  lastTimeSlotKeys: string[];
  lastFiredTrigger: LastFiredTrigger | null;
}

function loadState(): TriggerState {
  try {
    if (existsSync(STATE_PATH)) {
      const raw = readFileSync(STATE_PATH, "utf-8");
      const o = JSON.parse(raw) as TriggerState;
      return {
        lastIntervalRun: o.lastIntervalRun ?? null,
        lastTimeSlotKeys: Array.isArray(o.lastTimeSlotKeys) ? o.lastTimeSlotKeys : [],
        lastFiredTrigger:
          o.lastFiredTrigger && typeof o.lastFiredTrigger.at === "number"
            ? {
                type: o.lastFiredTrigger.type === "interval" ? "interval" : "time",
                label: String(o.lastFiredTrigger.label ?? ""),
                at: o.lastFiredTrigger.at,
              }
            : null,
      };
    }
  } catch {
    // ignore
  }
  return { lastIntervalRun: null, lastTimeSlotKeys: [], lastFiredTrigger: null };
}

function saveState(state: TriggerState): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state), "utf-8");
  } catch (e) {
    console.error("[triggerScheduler] saveState", e);
  }
}

/** "8:00" → "08:00" 형태로 통일 (비교 일치용) */
function normalizeHHMM(s: string): string {
  const [h, m] = String(s).trim().split(":");
  const hour = Math.max(0, Math.min(23, parseInt(h ?? "0", 10) || 0));
  const min = Math.max(0, Math.min(59, parseInt(m ?? "0", 10) || 0));
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseTimeSlots(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(parsed)
      ? parsed.map((s: unknown) => normalizeHHMM(String(s).trim())).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parseWeeklyDays(raw: string | null | undefined): number[] {
  if (raw == null) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** enabled=1 구역이 1개 이상인지 확인 (공급 실행 가능 여부) */
function hasEnabledZones(db: ReturnType<typeof getSupplyDb>): boolean {
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM zone_settings WHERE enabled = 1 AND zone_id <= ?"
  ).get(ZONE_COUNT) as { cnt: number };
  return (row?.cnt ?? 0) > 0;
}

/** 트리거 조건 충족 시 1회 공급 시작 */
function runTriggerCheck(): void {
  try {
    const db = getSupplyDb();
    if (!hasEnabledZones(db)) {
      console.warn("[triggerScheduler] 공급할 구역 없음 (enabled=1인 구역이 없음). 트리거 스킵.");
      return;
    }
    const modeRow = db.prepare("SELECT mode, weekly_days FROM supply_mode WHERE id = 1").get() as
      | { mode: string; weekly_days: string }
      | undefined;
    const triggerRow = db.prepare("SELECT trigger_type, time_slots, interval_minutes FROM supply_trigger WHERE id = 1").get() as
      | { trigger_type: string; time_slots: string; interval_minutes: number | null }
      | undefined;

    if (!triggerRow) return;
    if (getRunState().running) return;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const mode = modeRow?.mode ?? "daily";
    const weeklyDays = parseWeeklyDays(modeRow?.weekly_days);
    const allowToday = mode === "daily" || weeklyDays.includes(dayOfWeek);

    if (!allowToday) return;

    const state = loadState();

    if (triggerRow.trigger_type === "time") {
      const slots = parseTimeSlots(triggerRow.time_slots);
      if (slots.length === 0) return;
      const slotKey = `${today}_${currentHHMM}`;
      if (!slots.includes(currentHHMM) || state.lastTimeSlotKeys.includes(slotKey)) return;

      state.lastTimeSlotKeys = state.lastTimeSlotKeys.filter((k) => k.startsWith(today));
      if (!state.lastTimeSlotKeys.includes(slotKey)) state.lastTimeSlotKeys.push(slotKey);
      state.lastFiredTrigger = { type: "time", label: currentHHMM, at: Date.now() };
      saveState(state);

      setPendingCommand("start_once");
      runSupplySequence().catch((err) =>
        console.error("[triggerScheduler] 시간 트리거 runSupplySequence 오류:", err)
      );
      console.log("[triggerScheduler] 시간 트리거 실행:", currentHHMM);
      return;
    }

    if (triggerRow.trigger_type === "interval") {
      const intervalMinutes = triggerRow.interval_minutes;
      if (intervalMinutes == null || intervalMinutes < 1) return;

      const intervalMs = intervalMinutes * 60 * 1000;
      const last = state.lastIntervalRun ?? 0;
      if (Date.now() - last < intervalMs) return;

      state.lastIntervalRun = Date.now();
      state.lastFiredTrigger = { type: "interval", label: `${intervalMinutes}분`, at: Date.now() };
      saveState(state);

      setPendingCommand("start_once");
      runSupplySequence().catch((err) =>
        console.error("[triggerScheduler] 간격 트리거 runSupplySequence 오류:", err)
      );
      console.log("[triggerScheduler] 간격 트리거 실행:", intervalMinutes, "분");
    }
  } catch (e) {
    console.error("[triggerScheduler] runTriggerCheck", e);
  }
}

// 변경: 체크 주기 1초 (트리거 반응 빠르게)
const INTERVAL_MS = 1 * 1000;
let intervalId: ReturnType<typeof setInterval> | null = null;

/** 마지막 발동 트리거 조회 (메인/공급 예약 카드 표시용) */
export function getLastFiredTrigger(): LastFiredTrigger | null {
  return loadState().lastFiredTrigger;
}

/** 스케줄러 시작 (서버 기동 시 1회 호출) */
export function startTriggerScheduler(): void {
  if (intervalId != null) return;
  intervalId = setInterval(runTriggerCheck, INTERVAL_MS);
  console.log("[triggerScheduler] 시작 (1초 간격)");
}
