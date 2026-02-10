/**
 * 출력 릴레이 매핑: P1~P4=1032~1035, 밸브0~11=1036~1047
 * RunState(valves[12], pumps) → PLC 코일 배열(16) 변환
 */

import { ZONE_COUNT } from "@/lib/constants";
import {
  COIL_WRITE_LENGTH,
  RELAY_INDEX_P1,
  RELAY_INDEX_P2,
  RELAY_INDEX_P3,
  RELAY_INDEX_P4,
  RELAY_INDEX_VALVE_START,
  RELAY_INDEX_VALVE_END,
} from "./config";

/** 릴레이 인덱스 → 용도 (문서화/API용) */
export const RELAY_MAP = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
  /** 밸브 0~11 → 코일 인덱스 4~15 */
  zoneValves: Array.from({ length: 12 }, (_, i) => i + RELAY_INDEX_VALVE_START),
} as const;

export type RelayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * RunState(valves[12], pumps) → PLC 쓰기용 코일 배열 16개
 * - 인덱스 0~3: P1, P2, P3, P4
 * - 인덱스 4~15: 밸브 0~11
 */
export function buildCoilArrayFromRunState(
  valves: number[],
  pumps: { p1: number; p2: number; p3?: number; p4?: number }
): boolean[] {
  const arr: boolean[] = Array(COIL_WRITE_LENGTH).fill(false);
  arr[RELAY_INDEX_P1] = pumps.p1 === 1;
  arr[RELAY_INDEX_P2] = pumps.p2 === 1;
  arr[RELAY_INDEX_P3] = (pumps.p3 ?? 0) === 1;
  arr[RELAY_INDEX_P4] = (pumps.p4 ?? 0) === 1;
  for (let i = RELAY_INDEX_VALVE_START; i <= RELAY_INDEX_VALVE_END; i++) {
    const vi = i - RELAY_INDEX_VALVE_START;
    arr[i] = (valves[vi] ?? 0) === 1;
  }
  return arr;
}

/**
 * 코일 배열 16개 → { valves[12], pumps } 형태로 해석 (읽기 반영 시 사용)
 */
export function parseCoilArrayToRunState(coils: boolean[]): {
  valves: number[];
  pumps: { p1: number; p2: number };
} {
  const valves = Array(ZONE_COUNT).fill(0);
  for (let i = RELAY_INDEX_VALVE_START; i <= RELAY_INDEX_VALVE_END && i < coils.length; i++) {
    const vi = i - RELAY_INDEX_VALVE_START;
    valves[vi] = coils[i] ? 1 : 0;
  }
  return {
    valves,
    pumps: {
      p1: coils[RELAY_INDEX_P1] ? 1 : 0,
      p2: coils[RELAY_INDEX_P2] ? 1 : 0,
    },
  };
}
