/**
 * 시스템설정 API: PLC 설정, 센서 연결 상태
 */

import { NextRequest, NextResponse } from "next/server";
import { getSystemDb } from "@/lib/db";
import { setLastTankP1State } from "@/lib/control";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getSystemDb();
    const plc = db.prepare("SELECT * FROM plc_settings WHERE id = 1").get();
    const sensors = db.prepare("SELECT * FROM sensor_connections ORDER BY id").all();
    const tank = db.prepare("SELECT * FROM tank_calibration WHERE id = 1").get();
    let tankPump = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get();
    if (!tankPump) {
      db.prepare("INSERT OR IGNORE INTO tank_pump_settings (id, start_level_cm, stop_level_cm) VALUES (1, 20, 80)").run();
      tankPump = db.prepare("SELECT * FROM tank_pump_settings WHERE id = 1").get();
    }
    return NextResponse.json({ plc, sensors, tank, tankPump });
  } catch (e) {
    console.error("system settings GET", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getSystemDb();

    if (body.plc) {
      const { name, modbus_port, baud_rate, slave_id, relay_count } = body.plc;
      db.prepare(
        `UPDATE plc_settings SET name=?, modbus_port=?, baud_rate=?, slave_id=?, relay_count=?, updated_at=datetime('now') WHERE id=1`
      ).run(name ?? "", modbus_port ?? "", baud_rate ?? 9600, slave_id ?? 1, relay_count ?? 16);
    }

    if (Array.isArray(body.sensors)) {
      const stmt = db.prepare(
        "UPDATE sensor_connections SET address=?, enabled=?, updated_at=datetime('now') WHERE sensor_type=?"
      );
      body.sensors.forEach((s: { sensor_type: string; address?: string; enabled?: number }) => {
        stmt.run(s.address ?? "", s.enabled ?? 1, s.sensor_type);
      });
    }

    if (body.tank) {
      const { ad_min, ad_max, cm_min, cm_max } = body.tank;
      db.prepare(
        `UPDATE tank_calibration SET ad_min=?, ad_max=?, cm_min=?, cm_max=?, updated_at=datetime('now') WHERE id=1`
      ).run(ad_min ?? 0, ad_max ?? 1023, cm_min ?? 0, cm_max ?? 100);
    }

    if (body.tankPump) {
      const { start_level_cm, stop_level_cm } = body.tankPump;
      db.prepare(
        `UPDATE tank_pump_settings SET start_level_cm=?, stop_level_cm=?, updated_at=datetime('now') WHERE id=1`
      ).run(start_level_cm ?? 20, stop_level_cm ?? 80);
      // 변경: 수위 설정 저장 시 히스테리시스 초기화 → 다음 /api/status 에서 새 가동/정지 수위로 P1 즉시 반영
      setLastTankP1State(0);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("system settings PATCH", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
