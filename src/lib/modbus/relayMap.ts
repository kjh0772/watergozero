/**
 * 출력 릴레이 매핑: 1032 펌프(P1), 1033~1047 밸브0~14(구역 1~15)
 * RunState(valves[], pumps) → PLC 코일 배열(16) 변환
 */

import { ZONE_COUNT } from "@/lib/constants";
import {
  COIL_WRITE_LENGTH,
  RELAY_INDEX_P1,
  RELAY_INDEX_VALVE_START,
  RELAY_INDEX_VALVE_END,
} from "./config";

/** 릴레이 인덱스 → 용도 (문서화/API용) */
export const RELAY_MAP = {
  p1: 0,
  /** 밸브 0~14(구역 1~15) → 코일 인덱스 1~15 */
  zoneValves: Array.from({ length: 15 }, (_, i) => i + RELAY_INDEX_VALVE_START),
} as const;

export type RelayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * RunState(valves[], pumps) → PLC 쓰기용 코일 배열 16개
 * 인덱스 0: 펌프 P1(1032), 1~15: 밸브0~14(1033~1047, 구역 1~15)
 */
export function buildCoilArrayFromRunState(
  valves: number[],
  pumps: { p1: number; p2?: number; p3?: number; p4?: number }
): boolean[] {
  const arr: boolean[] = Array(COIL_WRITE_LENGTH).fill(false);
  arr[RELAY_INDEX_P1] = pumps.p1 === 1;
  for (let i = RELAY_INDEX_VALVE_START; i <= RELAY_INDEX_VALVE_END; i++) {
    const vi = i - RELAY_INDEX_VALVE_START;
    arr[i] = (valves[vi] ?? 0) === 1;
  }
  return arr;
}

/**
 * 코일 배열 16개 → { valves[], pumps } 형태로 해석 (읽기 반영 시 사용)
 * 인덱스 0: 펌프 P1, 1~15: 밸브0~14 (앱 구역은 ZONE_COUNT만큼만 사용)
 */
export function parseCoilArrayToRunState(coils: boolean[]): {
  valves: number[];
  pumps: { p1: number; p2: number };
} {
  const valves = Array(ZONE_COUNT).fill(0);
  for (let i = RELAY_INDEX_VALVE_START; i <= RELAY_INDEX_VALVE_END && i < coils.length; i++) {
    const vi = i - RELAY_INDEX_VALVE_START;
    if (vi < ZONE_COUNT) valves[vi] = coils[i] ? 1 : 0;
  }
  return {
    valves,
    pumps: {
      p1: coils[RELAY_INDEX_P1] ? 1 : 0,
      p2: 0,
    },
  };
}
