"use client";

/**
 * 메인 페이지: 현재시각, 센서 상태, 물탱크 수위, 펌프/밸브 동작상태
 */

import { useEffect, useState } from "react";
import type { LiveStatus } from "@/lib/types";

const SENSOR_LABELS: Record<string, string> = {
  temperature: "온도 (°C)",
  humidity: "습도 (%)",
  soil_moisture: "토양함수 (%)",
  soil_temp: "토양온도 (°C)",
};

export default function MainPage() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [controlLoading, setControlLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("상태 조회 실패");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, status?.running ? 1000 : 5000); // 공급 중이면 1초마다
    return () => clearInterval(t);
  }, [status?.running]);

  const requestStartOnce = async () => {
    setControlLoading(true);
    setControlMessage(null);
    try {
      const res = await fetch("/api/control/start-once", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setControlMessage(data.message ?? "1회 공급이 요청되었습니다.");
      fetchStatus();
    } catch (e) {
      setControlMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setControlLoading(false);
    }
  };

  const requestStop = async () => {
    setControlLoading(true);
    setControlMessage(null);
    try {
      const res = await fetch("/api/control/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setControlMessage(data.message ?? "공급 정지가 요청되었습니다.");
      fetchStatus();
    } catch (e) {
      setControlMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setControlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300">
        {error ?? "데이터 없음"}
      </div>
    );
  }

  const timeStr = new Date(status.currentTime).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">메인 대시보드</h1>
        {status.version != null && (
          <span className="text-sm text-slate-500">v{status.version}</span>
        )}
      </div>

      {/* 1회 공급 / 공급 정지 */}
      <section className="card">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          수동 제어
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={requestStartOnce}
            disabled={controlLoading}
            className="btn-primary disabled:opacity-60"
          >
            1회 공급
          </button>
          <button
            type="button"
            onClick={requestStop}
            disabled={controlLoading}
            className="rounded-lg border border-red-600 bg-red-900/40 px-4 py-2 font-medium text-red-300 transition hover:bg-red-900/60 disabled:opacity-60"
          >
            공급 정지
          </button>
          {status.controlPending === "start_once" && (
            <span className="text-sm text-amber-400">1회 공급 요청 대기 중</span>
          )}
          {status.controlPending === "stop" && (
            <span className="text-sm text-amber-400">공급 정지 요청 대기 중</span>
          )}
          {status.running && status.currentZone != null && (
            <span className="text-sm font-medium text-teal-400">
              공급 중 — 구역 {status.currentZone}
            </span>
          )}
          {controlMessage && (
            <span className="text-sm text-teal-400">{controlMessage}</span>
          )}
        </div>
      </section>

      {/* 현재 시각 */}
      <section className="card">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
          현재 시각
        </h2>
        <p className="text-2xl font-mono text-teal-400">{timeStr}</p>
      </section>

      {/* 센서 상태 */}
      <section className="card">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          센서 상태
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["temperature", "humidity", "soil_moisture", "soil_temp"] as const).map((key) => (
            <div key={key} className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs text-slate-400">{SENSOR_LABELS[key]}</p>
              <p className="mt-1 text-xl font-mono text-slate-100">
                {status.sensors[key] != null ? `${status.sensors[key]}` : "—"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 물탱크 수위 */}
      <section className="card">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
          물탱크 수위
        </h2>
        <div className="flex items-baseline gap-4">
          <span className="text-2xl font-mono text-teal-400">
            AD: {status.tankLevel.ad}
          </span>
          <span className="text-2xl font-mono text-teal-400">
            {status.tankLevel.cm} cm
          </span>
        </div>
        <div className="relative mt-2 h-4 w-full overflow-visible">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, (status.tankLevel.cm / 100) * 100))}%`,
              }}
            />
          </div>
          {status.tankPumpLevels && (
            <>
              <span
                className="absolute top-0 h-4 w-0.5 -translate-x-px bg-amber-500"
                style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.start_level_cm))}%` }}
                title={`가동 ${status.tankPumpLevels.start_level_cm}cm`}
              />
              <span
                className="absolute top-0 h-4 w-0.5 -translate-x-px bg-red-500"
                style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.stop_level_cm))}%` }}
                title={`정지 ${status.tankPumpLevels.stop_level_cm}cm`}
              />
            </>
          )}
        </div>
        {status.tankPumpLevels && (
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>가동 {status.tankPumpLevels.start_level_cm}cm</span>
            <span>정지 {status.tankPumpLevels.stop_level_cm}cm</span>
          </div>
        )}
      </section>

      {/* 동작 상태: PLC 연결, 펌프, 밸브 */}
      <section className="card">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          동작 상태
        </h2>
        <div className="mb-4">
          <p className="mb-2 text-slate-300">PLC 연결</p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-4 w-4 rounded-full ${
                status.plcConnected ? "bg-emerald-500" : "bg-slate-600"
              }`}
              title={status.plcConnected ? "연결됨" : "연결 안 됨"}
            />
            <span className="text-slate-200">
              {status.plcConnected
                ? `연결됨${status.plcCurrentPort ? ` (${status.plcCurrentPort})` : ""}`
                : "연결 안 됨"}
            </span>
          </div>
        </div>
        <div className="mb-4">
          <p className="mb-2 text-slate-300">펌프</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded-full ${
                  status.pumps.p1 ? "bg-green-500" : "bg-slate-600"
                }`}
              />
              <span className="text-slate-200">P1 (지하수)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded-full ${
                  status.pumps.p2 ? "bg-green-500" : "bg-slate-600"
                }`}
              />
              <span className="text-slate-200">P2 (공급펌프)</span>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-slate-300">지역 밸브 (12개)</p>
          <div className="flex flex-wrap gap-2">
            {status.valves.map((v, i) => {
              const zoneNum = i + 1;
              const isCurrentZone = status.currentZone === zoneNum;
              const enabled = status.zoneEnabled?.[i] ?? false;
              const remaining =
                isCurrentZone && status.remainingSeconds != null ? status.remainingSeconds : null;
              const durationSec = status.zoneDurations?.[i] ?? 0;
              const formatSec = (sec: number) =>
                sec >= 60
                  ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
                  : `${sec}초`;
              const displayStr =
                remaining != null ? formatSec(remaining) : durationSec > 0 ? formatSec(durationSec) : "—";
              const cellStyle = v
                ? "bg-teal-600 text-white"
                : enabled
                  ? "bg-teal-900/90 text-teal-200 border border-teal-700"
                  : "bg-slate-700 text-slate-400";
              return (
                <div
                  key={i}
                  className={`flex min-w-[3.5rem] flex-col items-center justify-center rounded px-2 py-1.5 text-xs font-medium ${cellStyle}`}
                >
                  <span>{zoneNum}</span>
                  <span className="mt-0.5 text-[10px] opacity-90">
                    {displayStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
