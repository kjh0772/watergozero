/**
 * 공급설정 API: 관수 방식, 트리거, 구역별 시간 (구역 1~12만)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupplyDb } from "@/lib/db";
import { ZONE_COUNT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getSupplyDb();
    const mode = db.prepare("SELECT * FROM supply_mode WHERE id = 1").get();
    const trigger = db.prepare("SELECT * FROM supply_trigger WHERE id = 1").get();
    const zones = db.prepare("SELECT * FROM zone_settings WHERE zone_id <= ? ORDER BY sort_order").all(ZONE_COUNT);
    return NextResponse.json({ mode, trigger, zones });
  } catch (e) {
    console.error("supply settings GET", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getSupplyDb();

    if (body.mode) {
      const { mode, weekly_days } = body.mode;
      db.prepare(
        `UPDATE supply_mode SET mode=?, weekly_days=?, updated_at=datetime('now') WHERE id=1`
      ).run(mode ?? "daily", typeof weekly_days === "string" ? weekly_days : JSON.stringify(weekly_days ?? [0,1,2,3,4,5,6]));
    }

    if (body.trigger) {
      const { trigger_type, time_slots, interval_minutes } = body.trigger;
      db.prepare(
        `UPDATE supply_trigger SET trigger_type=?, time_slots=?, interval_minutes=?, updated_at=datetime('now') WHERE id=1`
      ).run(
        trigger_type ?? "time",
        typeof time_slots === "string" ? time_slots : JSON.stringify(time_slots ?? ["08:00"]),
        interval_minutes ?? null
      );
    }

    if (Array.isArray(body.zones)) {
      const stmt = db.prepare(
        "UPDATE zone_settings SET name=?, duration_seconds=?, sort_order=?, enabled=?, updated_at=datetime('now') WHERE zone_id=?"
      );
      body.zones.forEach((z: { zone_id: number; name: string; duration_seconds: number; sort_order: number; enabled: number }) => {
        stmt.run(z.name ?? "", z.duration_seconds ?? 300, z.sort_order ?? 0, z.enabled ?? 1, z.zone_id);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("supply settings PATCH", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
