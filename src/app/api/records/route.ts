/**
 * 공급 기록 API: 목록 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecordsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    const db = getRecordsDb();
    const rows = db
      .prepare(
        "SELECT * FROM supply_records ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) as c FROM supply_records").get() as { c: number };

    return NextResponse.json({ records: rows, total: total.c });
  } catch (e) {
    console.error("records GET", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
