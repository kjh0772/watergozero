/**
 * 관수 시스템 DB 스키마 정의
 * - 시스템설정 DB, 공급설정 DB, 기록 DB
 */

export const SYSTEM_DB_PATH = "data/system_config.db";
export const SUPPLY_DB_PATH = "data/supply_config.db";
export const RECORDS_DB_PATH = "data/records.db";

// 시스템설정 DB: PLC 설정
export const PLC_SETTINGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS plc_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT DEFAULT 'PLC Main',
  modbus_port TEXT DEFAULT '/dev/ttyUSB0',
  baud_rate INTEGER DEFAULT 9600,
  slave_id INTEGER DEFAULT 1,
  relay_count INTEGER DEFAULT 16,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 시스템설정 DB: 센서 연결 상태
export const SENSOR_CONNECTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS sensor_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_type TEXT NOT NULL UNIQUE,
  address TEXT,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 시스템설정 DB: 물탱크 AD->cm 캘리브레이션
export const TANK_CALIBRATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS tank_calibration (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ad_min REAL DEFAULT 0,
  ad_max REAL DEFAULT 1023,
  cm_min REAL DEFAULT 0,
  cm_max REAL DEFAULT 100,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 시스템설정 DB: 지하수 펌프(P1) 물탱크 수위 기준 가동/정지
export const TANK_PUMP_SETTINGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS tank_pump_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  start_level_cm REAL NOT NULL DEFAULT 20,
  stop_level_cm REAL NOT NULL DEFAULT 80,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 공급설정 DB: 관수 방식 (요일별/매일)
export const SUPPLY_MODE_SCHEMA = `
CREATE TABLE IF NOT EXISTS supply_mode (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'daily',
  weekly_days TEXT DEFAULT '[0,1,2,3,4,5,6]',
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 공급설정 DB: 공급 트리거 (시간 등록/시간 간격)
export const SUPPLY_TRIGGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS supply_trigger (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  trigger_type TEXT NOT NULL DEFAULT 'time',
  time_slots TEXT DEFAULT '["08:00","18:00"]',
  interval_minutes INTEGER,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 공급설정 DB: 구역별 공급 시간 (순차)
export const ZONE_SETTINGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS zone_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// 기록 DB: 공급 기록
export const SUPPLY_RECORDS_SCHEMA = `
CREATE TABLE IF NOT EXISTS supply_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  zone_id INTEGER,
  pump_p1 INTEGER DEFAULT 0,
  pump_p2 INTEGER DEFAULT 0,
  valve_states TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export const SYSTEM_SCHEMAS = [
  PLC_SETTINGS_SCHEMA,
  SENSOR_CONNECTIONS_SCHEMA,
  TANK_CALIBRATION_SCHEMA,
  TANK_PUMP_SETTINGS_SCHEMA,
];

export const SUPPLY_SCHEMAS = [
  SUPPLY_MODE_SCHEMA,
  SUPPLY_TRIGGER_SCHEMA,
  ZONE_SETTINGS_SCHEMA,
];

export const RECORDS_SCHEMAS = [SUPPLY_RECORDS_SCHEMA];
