/**
 * DB 초기화 스크립트: data 폴더 생성 및 테이블/시드 데이터
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  SYSTEM_DB_PATH,
  SUPPLY_DB_PATH,
  RECORDS_DB_PATH,
  SYSTEM_SCHEMAS,
  SUPPLY_SCHEMAS,
  RECORDS_SCHEMAS,
} from "../src/lib/db/schema";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("data 폴더 생성됨");
}

function initDb(dbPath: string, schemas: string[], seed?: (db: Database.Database) => void) {
  const fullPath = path.join(process.cwd(), dbPath);
  const db = new Database(fullPath);
  db.pragma("journal_mode = WAL");
  schemas.forEach((s) => db.exec(s));
  if (seed) seed(db);
  db.close();
  console.log("초기화 완료:", dbPath);
}

// 시스템설정 시드: PLC 1행, 센서 타입별 1행, 탱크 캘리 1행
initDb(SYSTEM_DB_PATH, SYSTEM_SCHEMAS, (db) => {
  db.exec(`INSERT OR IGNORE INTO plc_settings (id) VALUES (1)`);
  const sensors = [
    ["temperature", "", 1],
    ["humidity", "", 1],
    ["soil_moisture", "", 1],
    ["soil_temp", "", 1],
    ["tank_level", "", 1],
  ];
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO sensor_connections (sensor_type, address, enabled) VALUES (?, ?, ?)"
  );
  sensors.forEach(([t, a, e]) => stmt.run(t, a, e));
  db.exec(`INSERT OR IGNORE INTO tank_calibration (id) VALUES (1)`);
  db.exec(`INSERT OR IGNORE INTO tank_pump_settings (id, start_level_cm, stop_level_cm) VALUES (1, 20, 80)`);
});

// 공급설정 시드: 모드/트리거 1행, 구역 12개
initDb(SUPPLY_DB_PATH, SUPPLY_SCHEMAS, (db) => {
  db.exec(`INSERT OR IGNORE INTO supply_mode (id) VALUES (1)`);
  db.exec(`INSERT OR IGNORE INTO supply_trigger (id) VALUES (1)`);
  const zoneStmt = db.prepare(
    "INSERT OR IGNORE INTO zone_settings (zone_id, name, duration_seconds, sort_order) VALUES (?, ?, ?, ?)"
  );
  for (let z = 1; z <= 12; z++) {
    zoneStmt.run(z, `구역 ${z}`, 5, z);
  }
});

// 기록 DB는 스키마만
initDb(RECORDS_DB_PATH, RECORDS_SCHEMAS);

console.log("모든 DB 초기화 완료.");
