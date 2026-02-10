/**
 * SQLite DB 연결 (서버 전용)
 * 시스템설정, 공급설정, 기록 3개 DB
 */

import Database from "better-sqlite3";
import path from "path";
import {
  SYSTEM_DB_PATH,
  SUPPLY_DB_PATH,
  RECORDS_DB_PATH,
  SYSTEM_SCHEMAS,
  SUPPLY_SCHEMAS,
  RECORDS_SCHEMAS,
} from "./schema";

const dataDir = path.join(process.cwd(), "data");

function getDb(dbPath: string, schemas: string[]) {
  const fullPath = path.join(process.cwd(), dbPath);
  const db = new Database(fullPath);
  db.pragma("journal_mode = WAL");
  schemas.forEach((s) => db.exec(s));
  return db;
}

let systemDb: Database.Database | null = null;
let supplyDb: Database.Database | null = null;
let recordsDb: Database.Database | null = null;

export function getSystemDb(): Database.Database {
  if (!systemDb) {
    systemDb = getDb(SYSTEM_DB_PATH, SYSTEM_SCHEMAS);
  }
  return systemDb;
}

export function getSupplyDb(): Database.Database {
  if (!supplyDb) {
    supplyDb = getDb(SUPPLY_DB_PATH, SUPPLY_SCHEMAS);
  }
  return supplyDb;
}

export function getRecordsDb(): Database.Database {
  if (!recordsDb) {
    recordsDb = getDb(RECORDS_DB_PATH, RECORDS_SCHEMAS);
  }
  return recordsDb;
}

export { dataDir };
