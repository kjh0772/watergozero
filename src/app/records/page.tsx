"use client";

/**
 * 공급 기록 조회 페이지
 * 변경: 시니어 친화 큰 글씨 + 반응형 디자인 (모바일 카드 / 데스크톱 테이블)
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

  return (
    <div className="space-y-5 md:space-y-4">
      {/* 변경: 시니어 기준 큰 제목 */}
      <div className="flex items-baseline gap-3">
        <h1 className="page-title">공급 기록</h1>
        <p className="text-xl md:text-base text-slate-400">총 {total}건</p>
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
                <span className="text-lg text-slate-500">{r.created_at}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xl">
                <div>
                  <span className="text-lg text-slate-400 block">시작</span>
                  <p className="text-slate-200 font-medium">{r.started_at}</p>
                </div>
                <div>
                  <span className="text-lg text-slate-400 block">종료</span>
                  <p className="text-slate-200 font-medium">{r.ended_at ?? "—"}</p>
                </div>
                <div>
                  <span className="text-lg text-slate-400 block">구역</span>
                  <p className="text-slate-200 font-medium">{r.zone_id ?? "—"}</p>
                </div>
                <div>
                  <span className="text-lg text-slate-400 block">펌프</span>
                  <p className="text-slate-200 font-medium">
                    P1:{r.pump_p1 ? "ON" : "—"} P2:{r.pump_p2 ? "ON" : "—"}
                  </p>
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
                <th className="px-5 py-3.5 font-semibold text-slate-300">시작</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">종료</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">구역</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">P1</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">P2</th>
                <th className="px-5 py-3.5 font-semibold text-slate-300">기록일시</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-lg text-slate-500">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-300">{r.id}</td>
                    <td className="px-5 py-3.5 text-slate-200">{r.started_at}</td>
                    <td className="px-5 py-3.5 text-slate-200">{r.ended_at ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-200">{r.zone_id ?? "—"}</td>
                    <td className="px-5 py-3.5">{r.pump_p1 ? "ON" : "—"}</td>
                    <td className="px-5 py-3.5">{r.pump_p2 ? "ON" : "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400">{r.created_at}</td>
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
