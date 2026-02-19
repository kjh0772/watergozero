"use client";

/**
 * 공급 기록 조회 페이지
 * 변경: 시니어 친화 큰 글씨 + 반응형 디자인 (모바일 카드 / 데스크톱 테이블)
 */

import { useEffect, useState } from "react";
import type { SupplyRecord } from "@/lib/types";

const TZ_KOREA = "Asia/Seoul";

/** 매핑: 코일 인덱스 0=Ch1(펌프), 1~15=Ch2~Ch16(밸브 구역1~15) — 기록 카드용 */
function getOutputChannelsFromRecord(r: SupplyRecord): string {
  const channels: number[] = [];
  if (r.pump_p1) channels.push(1);
  if (r.zone_id != null && r.zone_id >= 1) channels.push(r.zone_id + 1);
  if (r.valve_states) {
    try {
      const arr = JSON.parse(r.valve_states) as unknown[];
      if (Array.isArray(arr)) {
        arr.forEach((v, i) => {
          if (v === 1 && i + 2 <= 16 && !channels.includes(i + 2)) channels.push(i + 2);
        });
      }
    } catch {
      // ignore
    }
  }
  const unique = [...new Set(channels)].sort((a, b) => a - b);
  return unique.length ? unique.map((c) => `Ch${c}`).join(", ") : "—";
}

/** 서버에서 오는 날짜 문자열을 UTC로 해석 (SQLite "YYYY-MM-DD HH:mm:ss" → UTC) */
function parseRecordTime(iso: string | null | undefined): Date | null {
  if (iso == null || iso === "") return null;
  const s = String(iso).trim();
  if (!s) return null;
  if (/Z$/i.test(s) || s.includes("T")) return new Date(s);
  const utc = s.replace(" ", "T") + "Z";
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO 타임스탬프를 한국시간(UTC+9) HH:mm:ss로 표시 */
function formatTime(iso: string | null | undefined): string {
  const d = parseRecordTime(iso);
  if (d == null) return "—";
  try {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ_KOREA,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = f.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    return `${get("hour").padStart(2, "0")}:${get("minute").padStart(2, "0")}:${get("second").padStart(2, "0")}`;
  } catch {
    return String(iso);
  }
}

/** 한국시간 기준 날짜 부분 (오늘 비교용) */
function getKoreaParts(iso: string): { y: number; m: number; d: number } {
  const d = parseRecordTime(iso);
  if (!d) return { y: 0, m: 0, d: 0 };
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_KOREA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = f.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10) - 1,
    d: parseInt(get("day"), 10),
  };
}

/** 한국시간 기준 오늘 날짜 (y, m, d) */
function getKoreaToday(): { y: number; m: number; d: number } {
  const now = new Date();
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ_KOREA, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = f.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10) - 1,
    d: parseInt(get("day"), 10),
  };
}

/** 오늘(한국날짜) 기록만 필터 */
function getTodayRecords(records: SupplyRecord[]): SupplyRecord[] {
  const today = getKoreaToday();
  return records.filter((r) => {
    const p = getKoreaParts(r.started_at);
    return p.y === today.y && p.m === today.m && p.d === today.d;
  });
}

/** 10분 간격 슬롯 인덱스 (0~143): 한국시간 기준 시·분으로 계산 */
const SLOTS_PER_HOUR = 6; // 60/10
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR; // 144

function getTenMinuteSlotIndex(isoOrDate: string | Date): number {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const hour = parseInt(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ_KOREA, hour: "2-digit", hour12: false }).format(d),
    10
  );
  const minute = parseInt(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ_KOREA, minute: "2-digit" }).format(d),
    10
  );
  const slot = hour * SLOTS_PER_HOUR + Math.floor(minute / 10);
  return Math.max(0, Math.min(slot, TOTAL_SLOTS - 1));
}

/** 10분 간격별 공급시간(초) 배열 [0~143] — 한국시간 기준 */
function getTenMinuteDurations(records: SupplyRecord[]): number[] {
  const slots = Array(TOTAL_SLOTS).fill(0);
  for (const r of records) {
    const startD = parseRecordTime(r.started_at);
    const endD = parseRecordTime(r.ended_at ?? undefined);
    if (!startD) continue;
    const startMs = startD.getTime();
    const endMs = endD ? endD.getTime() : startMs;
    if (endMs <= startMs) continue;
    const durationSec = Math.ceil((endMs - startMs) / 1000);
    for (let s = 0; s < durationSec; s++) {
      const t = new Date(startMs + s * 1000);
      const idx = getTenMinuteSlotIndex(t);
      slots[idx] += 1;
    }
  }
  return slots;
}

/** 슬롯 인덱스 → "HH:00" 형식 (0~24시, 10분 단위는 0으로 표기) */
function slotToTimeLabel(slotIndex: number): string {
  const hour = Math.floor(slotIndex / SLOTS_PER_HOUR);
  const min = (slotIndex % SLOTS_PER_HOUR) * 10;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<SupplyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/records?limit=100");
        if (!res.ok) throw new Error("조회 실패");
        const data = await res.json();
        setRecords(data.records);
        setTotal(data.total);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-2xl md:text-xl text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-xl text-red-300">
        {error}
      </div>
    );
  }

  const todayRecords = getTodayRecords(records);
  const slotDurations = getTenMinuteDurations(todayRecords);
  const maxSeconds = Math.max(1, ...slotDurations);
  const chartHeight = 120;

  return (
    <div className="space-y-5 md:space-y-4">
      {/* 변경: 시니어 기준 큰 제목 */}
      <div className="flex items-baseline gap-3">
        <h1 className="page-title">공급 기록</h1>
        <p className="text-xl md:text-base text-slate-400">총 {total}건</p>
      </div>

      {/* 오늘 공급 바 차트: 카드 너비 100%, 스크롤 없이 10분 간격 144구간 전체 표시 */}
      <div className="card">
        <h2 className="text-xl md:text-base font-semibold text-slate-200 mb-3">
          오늘 공급 현황 (10분 간격) {todayRecords.length > 0 && `· ${todayRecords.length}건`}
        </h2>
        <div className="min-h-[140px]">
          {todayRecords.length === 0 ? (
            <p className="py-8 text-center text-slate-500">오늘 공급 기록이 없습니다.</p>
          ) : (
            <>
              <div className="flex items-end gap-px h-[140px] w-full">
                {slotDurations.map((sec, i) => {
                  const endLabel = i === TOTAL_SLOTS - 1 ? "24:00" : slotToTimeLabel(i + 1);
                  const rangeLabel = `${slotToTimeLabel(i)}~${endLabel}`;
                  const heightPx = sec > 0 ? Math.max(6, (sec / maxSeconds) * chartHeight) : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end group"
                      title={`${rangeLabel}: ${Math.round(sec)}초`}
                    >
                      <div
                        className="w-full max-w-full bg-teal-500 rounded-t transition-all group-hover:bg-teal-400"
                        style={{ height: `${heightPx}px`, minHeight: sec > 0 ? 4 : 0 }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>0시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">Y축: 공급시간(초) / X축: 0~24시 (10분 간격)</p>
            </>
          )}
        </div>
      </div>

      {/* 모바일: 카드 리스트 (시니어 친화 큰 글씨 + 넓은 터치 영역) */}
      <div className="flex flex-col gap-4 md:hidden">
        {records.length === 0 ? (
          <div className="card py-10 text-center text-xl text-slate-500">기록이 없습니다.</div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-mono font-bold text-slate-200">#{r.id}</span>
                <span className="text-lg text-slate-500">{formatTime(r.created_at)}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xl">
                <div>
                  <span className="text-lg text-slate-400 block">구역</span>
                  <p className="text-slate-200 font-medium">{r.zone_id ?? "—"}</p>
                </div>
                <div>
                  <span className="text-lg text-slate-400 block">출력</span>
                  <p className="text-slate-200 font-medium">{getOutputChannelsFromRecord(r)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* md+: 테이블 (데스크톱 일반 크기) */}
      <div className="card overflow-hidden p-0 hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-slate-600 bg-slate-700/50">
                <th className="px-5 py-3.5 font-semibold text-slate-300">ID</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">구역</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">출력</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">기록일시</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-lg text-slate-500">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-300">{r.id}</td>
                    <td className="px-5 py-3.5 text-slate-200">{r.zone_id ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-200">{getOutputChannelsFromRecord(r)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{formatTime(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
