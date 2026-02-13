/**
 * 관수 시스템 공통 타입
 */

// PLC 설정
export interface PlcSettings {
  id: number;
  name: string;
  modbus_port: string;
  baud_rate: number;
  slave_id: number;
  relay_count: number;
  updated_at: string;
}

// 센서 연결
export interface SensorConnection {
  id: number;
  sensor_type: "temperature" | "humidity" | "soil_moisture" | "soil_temp" | "tank_level";
  address: string;
  enabled: number;
  updated_at: string;
}

// 물탱크 캘리브레이션
export interface TankCalibration {
  id: number;
  ad_min: number;
  ad_max: number;
  cm_min: number;
  cm_max: number;
  updated_at: string;
}

// 지하수 펌프(P1) 물탱크 수위 기준 가동/정지
export interface TankPumpSettings {
  id: number;
  start_level_cm: number;
  stop_level_cm: number;
  updated_at: string;
}

// 공급 모드: daily | weekly
export interface SupplyMode {
  id: number;
  mode: "daily" | "weekly";
  weekly_days: string; // JSON "[0,1,2,...]"
  updated_at: string;
}

// 공급 트리거: time | interval
export interface SupplyTrigger {
  id: number;
  trigger_type: "time" | "interval";
  time_slots: string; // JSON ["08:00","18:00"]
  interval_minutes: number | null;
  updated_at: string;
}

// 구역 설정
export interface ZoneSetting {
  id: number;
  zone_id: number;
  name: string;
  duration_seconds: number;
  sort_order: number;
  enabled: number;
  updated_at: string;
}

// 공급 기록
export interface SupplyRecord {
  id: number;
  started_at: string;
  ended_at: string | null;
  zone_id: number | null;
  pump_p1: number;
  pump_p2: number;
  valve_states: string | null;
  created_at: string;
}

// 제어 대기 명령 (메인 페이지 표시용)
export type ControlPending = "start_once" | "stop" | null;

// 실시간 상태 (메인 페이지용)
export interface LiveStatus {
  version?: string;
  currentTime: string;
  controlPending: ControlPending;
  /** 공급 시퀀스 실행 중 여부 */
  running?: boolean;
  /** 현재 공급 중인 구역 (1~12) */
  currentZone?: number | null;
  /** 현재 구역 잔여 공급시간(초) */
  remainingSeconds?: number | null;
  sensors: {
    temperature: number | null;
    humidity: number | null;
    soil_moisture: number | null;
    soil_temp: number | null;
  };
  tankLevel: { ad: number; cm: number };
  /** 지하수 펌프 가동/정지 수위 (progress bar 표시용) */
  tankPumpLevels?: { start_level_cm: number; stop_level_cm: number };
  pumps: { p1: number; p2: number };
  valves: number[]; // 12개 0/1
  /** 구역별 설정 공급시간(초) 12개 */
  zoneDurations?: number[];
  /** 구역별 공급 선택(enabled) 12개 */
  zoneEnabled?: boolean[];
  /** PLC(Modbus) 연결 여부 */
  plcConnected?: boolean;
  /** PLC 연결 포트 (연결됐을 때만) */
  plcCurrentPort?: string | null;
  /** 공급 트리거 예약 요약 (메인 예약 카드용) */
  triggerSummary?: {
    mode: "daily" | "weekly";
    weeklyDays?: number[];
    triggerType: "time" | "interval";
    timeSlots?: string[];
    intervalMinutes?: number | null;
  } | null;
  /** 마지막 발동 트리거 (해당 트리거 표시용) */
  lastFiredTrigger?: { type: "time" | "interval"; label: string; at: number } | null;
}
