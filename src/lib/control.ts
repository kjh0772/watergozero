/**
 * 제어 명령 저장 (1회 공급 / 공급 정지)
 * 공급 시퀀스 실행 시 동작 상태 저장 (GET /api/status 에서 반영)
 */

import { ZONE_COUNT } from "@/lib/constants";

export type PendingCommand = "start_once" | "stop" | null;

export interface RunState {
  running: boolean;
  currentZone: number | null;
  /** 현재 구역 시작 시각 (ms, Date.now()) */
  currentZoneStartedAt: number | null;
  /** 현재 구역 공급시간(초) */
  currentZoneDuration: number | null;
  pumps: { p1: number; p2: number };
  valves: number[];
}

let pendingCommand: PendingCommand = null;
let runState: RunState = {
  running: false,
  currentZone: null,
  currentZoneStartedAt: null,
  currentZoneDuration: null,
  pumps: { p1: 0, p2: 0 },
  valves: Array(ZONE_COUNT).fill(0),
};

/** 지하수 펌프(P1) 수위 히스테리시스용 마지막 상태 (0|1) */
let lastTankP1State: 0 | 1 = 0;

export function getPendingCommand(): PendingCommand {
  return pendingCommand;
}

export function setPendingCommand(cmd: PendingCommand): void {
  pendingCommand = cmd;
}

/** 컨트롤러가 명령 처리 후 호출하여 대기 명령 초기화 */
export function clearPendingCommand(): void {
  pendingCommand = null;
}

export function getRunState(): RunState {
  return { ...runState };
}

export function setRunState(state: Partial<RunState>): void {
  runState = { ...runState, ...state };
}

export function clearRunState(): void {
  runState = {
    running: false,
    currentZone: null,
    currentZoneStartedAt: null,
    currentZoneDuration: null,
    pumps: { p1: 0, p2: 0 },
    valves: Array(ZONE_COUNT).fill(0),
  };
}

export function getLastTankP1State(): 0 | 1 {
  return lastTankP1State;
}

export function setLastTankP1State(s: 0 | 1): void {
  lastTankP1State = s;
}

/** 공급 정지 요청 여부 */
export function isStopRequested(): boolean {
  return pendingCommand === "stop";
}
