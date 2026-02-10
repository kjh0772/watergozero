"use client";

/**
 * 공급 기록 조회 페이지
 */

import { useEffect, useState } from "react";
import type { SupplyRecord } from "@/lib/types";

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
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">공급 기록 조회</h1>
      <p className="text-slate-400">총 {total}건</p>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-600 bg-slate-700/50">
                <th className="px-4 py-3 font-medium text-slate-300">ID</th>
                <th className="px-4 py-3 font-medium text-slate-300">시작</th>
                <th className="px-4 py-3 font-medium text-slate-300">종료</th>
                <th className="px-4 py-3 font-medium text-slate-300">구역</th>
                <th className="px-4 py-3 font-medium text-slate-300">P1</th>
                <th className="px-4 py-3 font-medium text-slate-300">P2</th>
                <th className="px-4 py-3 font-medium text-slate-300">기록일시</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-mono text-slate-300">{r.id}</td>
                    <td className="px-4 py-3 text-slate-200">{r.started_at}</td>
                    <td className="px-4 py-3 text-slate-200">{r.ended_at ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-200">{r.zone_id ?? "—"}</td>
                    <td className="px-4 py-3">{r.pump_p1 ? "ON" : "—"}</td>
                    <td className="px-4 py-3">{r.pump_p2 ? "ON" : "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{r.created_at}</td>
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
